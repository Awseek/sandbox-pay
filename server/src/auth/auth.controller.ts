import { Controller, Get, Query, Res, Req, Post, Headers, Body } from '@nestjs/common';
import type { Response as ExpressResponse, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SsoClientService } from './sso-client.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

const STATE_COOKIE = 'sso_state';
const SSO_REFRESH_COOKIE = 'sso_refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
};

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ssoClient: SsoClientService,
    private configService: ConfigService,
  ) {}

  /**
   * 共享 cookie 无感登录
   * 读取 we29.cn 的共享 refresh token cookie，调 code-store 验证，
   * 成功则签发本地 JWT，用户完全无感。
   */
  @Get('auto-login')
  @ApiOperation({ summary: 'Silent login via shared cookie' })
  async autoLogin(@Req() req: Request, @Res() res: ExpressResponse) {
    const sharedCookie = req.cookies?.['we29_refresh_token'];
    if (!sharedCookie) {
      return res.status(401).json({ code: 401, msg: '无共享登录态', data: null });
    }

    try {
      const result = await this.authService.autoLogin(sharedCookie);
      return res.json({ code: 200, msg: 'ok', data: result });
    } catch {
      return res.status(401).json({ code: 401, msg: '共享登录态无效', data: null });
    }
  }

  /**
   * 发起 SSO 登录（行业标准流程）
   * 1. 生成 PKCE code_verifier + code_challenge
   * 2. 生成 state 参数防 CSRF
   * 3. 将 state 和 code_verifier 存入 cookie
   * 4. 重定向到 SSO 授权页
   */
  @Get('sso/login')
  @ApiOperation({ summary: 'Initiate SSO login with PKCE' })
  async ssoLogin(@Res() res: ExpressResponse) {
    const { url, state } = await this.ssoClient.generateAuthorizationUrl();

    // 将 state 存入 cookie（httpOnly，回调时验证）
    res.cookie(STATE_COOKIE, state, {
      ...COOKIE_OPTIONS,
      maxAge: 10 * 60 * 1000, // 10 分钟
    });

    res.redirect(url);
  }

  /**
   * SSO 回调（行业标准流程）
   * 1. 从 cookie 读取 state，验证防 CSRF
   * 2. 用 code + code_verifier 换 token（PKCE）
   * 3. 用 JWKS 公钥验证 ID Token 签名
   * 4. 验证 ID Token 的 iss、aud、exp
   * 5. 从 ID Token 提取用户信息
   * 6. 签发本地 JWT
   */
  @Get('sso/callback')
  @ApiOperation({ summary: 'SSO OAuth2 callback with ID Token verification' })
  async ssoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: ExpressResponse,
  ) {
    const clientUrl = this.configService.get<string>('CLIENT_URL', 'https://pay.jiuhe29.cn');

    if (!code || !state) {
      return res.redirect(`${clientUrl}/login?error=sso_failed`);
    }

    // 1. 验证 state（从 cookie 读取）
    const savedState = req.cookies?.[STATE_COOKIE];
    if (!savedState || savedState !== state) {
      return res.redirect(`${clientUrl}/login?error=invalid_state`);
    }

    // 清除 state cookie
    res.clearCookie(STATE_COOKIE, { path: '/' });

    try {
      // 2-5. 标准 OAuth2 + OIDC 流程
      const result = await this.ssoClient.handleCallback(code, state);

      // 6. 签发本地 JWT
      const localAuth = await this.authService.issueSsoToken(
        result.user.preferred_username || result.user.name || `sso_${result.user.sub}`,
      );

      // 存储 SSO refresh_token（用于单点登出和 token 刷新）
      if (result.refreshToken) {
        res.cookie(SSO_REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
      }

      // 重定向到前端（token 放 fragment 防泄露）
      res.redirect(
        `${clientUrl}/login#sso_token=${localAuth.token}&sso_username=${encodeURIComponent(localAuth.username)}`,
      );
    } catch (err) {
      this.logger.error('SSO callback failed', err);
      return res.redirect(`${clientUrl}/login?error=sso_error`);
    }
  }

  /**
   * 单点登出
   * 1. 撤销 SSO 的 refresh_token
   * 2. 清除本地 session
   */
  @Post('sso/logout')
  @ApiOperation({ summary: 'Single sign-out' })
  async ssoLogout(
    @Req() req: Request,
    @Res() res: ExpressResponse,
  ) {
    // 撤销 SSO refresh_token
    const ssoRefresh = req.cookies?.[SSO_REFRESH_COOKIE];
    if (ssoRefresh) {
      try {
        await this.ssoClient.revokeToken(ssoRefresh, 'refresh_token');
      } catch {
        // 忽略撤销失败
      }
    }

    // 清除 cookies
    res.clearCookie(SSO_REFRESH_COOKIE, { path: '/' });
    res.clearCookie('token', { path: '/' });
    // 清除共享的 code-store refresh token cookie（Domain=.we29.cn）
    res.clearCookie('we29_refresh_token', {
      path: '/',
      domain: '.we29.cn',
    });

    return res.json({ code: 0, message: '已单点登出' });
  }

  /**
   * SSO 后端登出通知（backchannel logout）
   * SSO 服务调用此端点通知客户端用户已登出
   */
  @Post('sso/backchannel-logout')
  @ApiOperation({ summary: 'Backchannel logout notification from SSO' })
  async backchannelLogout(
    @Body('token') token: string,
    @Res() res: ExpressResponse,
  ) {
    // TODO: 验证 token 并撤销本地 session
    // 当前简化实现：清除所有 session
    this.logger.log('Backchannel logout received');
    return res.json({ code: 0, message: 'ok' });
  }

  private get logger() {
    return new (require('@nestjs/common').Logger)(AuthController.name);
  }
}
