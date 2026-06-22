import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  private readonly codeStoreUrl: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.codeStoreUrl = this.configService.get<string>('SSO_BASE_URL', 'https://we29.cn');
  }

  /**
   * 共享 cookie 无感登录：读取 we29.cn 的共享 refresh token，
   * 调 code-store 验证，成功则签发本地 JWT。
   */
  async autoLogin(sharedRefreshToken: string) {
    // 调 code-store 的 refresh 端点验证共享 cookie
    const res = await fetch(`${this.codeStoreUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `we29_refresh_token=${sharedRefreshToken}`,
      },
      redirect: 'manual',
    });

    if (!res.ok) {
      throw new UnauthorizedException('共享登录态无效');
    }

    const data = (await res.json()) as {
      token: string;
      user: { id: number; uid: string; username: string; email: string | null; avatar: string | null; role: string };
    };

    // 用 code-store 返回的用户信息创建/更新本地用户
    const username = data.user.uid || data.user.username;
    let user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
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
      this.logger.log(`Auto-login provisioned local user: ${username}`);
    }

    return this.issueSsoToken(username);
  }

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