import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('sso/callback')
  @ApiOperation({ summary: 'SSO callback from we29.cn' })
  async ssoCallback(
    @Query('sso_token') ssoToken: string,
    @Query('sso_username') ssoUsername: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    try {
      // 验证 we29.cn 的 SSO token
      const we29Res = await fetch(
        `https://we29.cn/api/auth/sso/validate?token=${encodeURIComponent(ssoToken)}`,
      );
      const we29Data = await we29Res.json() as any;

      // TransformInterceptor wraps in {code:0, data:{code:200, data:{username}}}
      const inner = we29Data?.data || we29Data;
      if (inner?.code === 200 && inner?.data) {
        const { username } = inner.data;
        // 同步用户到本地并生成 token（无密码模式）
        const result = await this.authService.syncLogin({ username, password: '' });
        // 重定向回前端，带上 token
        const frontendUrl = process.env.FRONTEND_URL || 'https://pay.we29.cn';
        res.redirect(`${frontendUrl}/login?sso_token=${result.token}&sso_username=${encodeURIComponent(username)}`);
      } else {
        const frontendUrl = process.env.FRONTEND_URL || 'https://pay.we29.cn';
        res.redirect(`${frontendUrl}/login?error=sso_failed`);
      }
    } catch (err) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://pay.we29.cn';
      res.redirect(`${frontendUrl}/login?error=sso_error`);
    }
  }

  @Post('sync-login')
  @ApiOperation({ summary: 'Sync login from we29.cn (auto-create local user)' })
  async syncLogin(@Body() dto: LoginDto) {
    return this.authService.syncLogin(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
