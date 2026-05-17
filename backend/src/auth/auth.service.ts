import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * Auth surface is intentionally minimal: the ONLY way into the dashboard is
 * the we29.cn SSO callback. There is no local username/password login,
 * no seeded admin account, and no public sync-login endpoint — those used
 * to be a fallback but became an authentication bypass the moment the
 * service was reachable on a network.
 *
 * `issueSsoToken` is invoked exclusively by `AuthController.ssoCallback`
 * AFTER it has validated the SSO token against we29.cn.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Issue a local JWT for an SSO-verified principal. Auto-provisions a
   * local user row on first sight so audit/foreign-key relations work.
   * Never expose this directly to the network — it skips password checks
   * by design.
   */
  async issueSsoToken(username: string) {
    let user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      // Generate a random local password just to satisfy the NOT NULL
      // column. Nobody will ever use it — login is SSO-only.
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(2) + Date.now().toString(36),
        10,
      );
      user = this.userRepository.create({
        username,
        password: randomPassword,
        role: UserRole.Admin,
      });
      await this.userRepository.save(user);
      this.logger.log(`SSO provisioned local user: ${username}`);
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      username: user.username,
      role: user.role,
      source: 'we29_sso',
    };
  }
}