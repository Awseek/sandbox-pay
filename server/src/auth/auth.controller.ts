import { Controller, Get, Req, Res, Logger } from '@nestjs/common';
import type { Response as ExpressResponse, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * 共享 cookie 无感登录
   * 读取 we29.cn 的共享 refresh token cookie，调 code-store 验证，
   * 成功则签发本地 JWT，用户完全无感。
   */
  @Get('auto-login')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Silent login via shared cookie' })
  async autoLogin(@Req() req: Request, @Res() res: ExpressResponse) {
    const sharedCookie = req.cookies?.['we29_refresh_token'];
    this.logger.log(`[auto-login] we29_refresh_token: ${sharedCookie ? 'present' : 'MISSING'}`);

    if (!sharedCookie) {
      return res.status(401).json({ code: 401, msg: '无共享登录态', data: null });
    }

    try {
      const result = await this.authService.autoLogin(sharedCookie);
      this.logger.log(`[auto-login] success for user: ${result.username ?? 'unknown'}`);

      // 同步 code-store 轮换后的新 refresh token 到浏览器 cookie
      if (result.newRefreshToken) {
        res.cookie('we29_refresh_token', result.newRefreshToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
        });
      }

      const { newRefreshToken: _, ...data } = result;
      return res.json({ code: 200, msg: 'ok', data });
    } catch (err) {
      this.logger.error(`[auto-login] failed: ${err}`);
      return res.status(401).json({ code: 401, msg: '共享登录态无效', data: null });
    }
  }
}
