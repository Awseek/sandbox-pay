import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SANDBOX_PAY_ACCESS_COOKIE } from './jwt.strategy';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  session(@Req() req: Request) {
    return req.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SANDBOX_PAY_ACCESS_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out' };
  }
}
