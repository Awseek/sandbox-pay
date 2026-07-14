import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Mint a local HS256 session JWT for a user. Reusable primitive for any
   * future login flow (password login, admin bootstrap, etc.).
   */
  issueLocalToken(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      username: user.username,
      role: user.role,
    };
  }
}
