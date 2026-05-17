import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface SsoInner {
  code?: number;
  data?: { username?: string };
}

interface SsoValidateResponse extends SsoInner {
  data?: SsoInner['data'];
}

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('sso/callback')
  @ApiOperation({ summary: 'SSO callback from we29.cn' })
  async ssoCallback(
    @Query('sso_token') ssoToken: string,
    @Res() res: ExpressResponse,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://pay.we29.cn';
    try {
      const validateUrl = 'https://we29.cn/api/auth/sso/validate?token=' + encodeURIComponent(ssoToken);
      const we29Res = await fetch(validateUrl);
      const we29Data = (await we29Res.json()) as { code?: number; data?: SsoInner } & SsoInner;

      const inner: SsoInner = (we29Data?.data as SsoInner) ?? we29Data;
      const username = inner?.data?.username;
      if (inner?.code !== 200 || !username) {
        return res.redirect(`${frontendUrl}/login?error=sso_failed`);
      }
      const result = await this.authService.issueSsoToken(username);
      res.redirect(
        `${frontendUrl}/login?sso_token=${result.token}&sso_username=${encodeURIComponent(username)}`,
      );
    } catch {
      res.redirect(`${frontendUrl}/login?error=sso_error`);
    }
  }
}
