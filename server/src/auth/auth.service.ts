import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * Auth surface is intentionally minimal: the ONLY way into the dashboard is
 * the shared-cookie silent login against we29.cn. There is no local
 * username/password login, no seeded admin account, and no SSO callback flow.
 *
 * `issueLocalToken` is invoked exclusively after we29.cn has validated the
 * shared refresh token.
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
   * 返回值额外携带 newRefreshToken，供 controller 同步更新浏览器 cookie。
   */
  async autoLogin(sharedRefreshToken: string) {
    const url = `${this.codeStoreUrl}/api/v1/auth/refresh`;
    this.logger.log(`[autoLogin] calling code-store: ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Cookie: `we29_refresh_token=${sharedRefreshToken}`,
      },
      redirect: 'manual',
    });

    this.logger.log(`[autoLogin] code-store responded: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      this.logger.error(`[autoLogin] code-store error body: ${body}`);
      throw new UnauthorizedException('共享登录态无效');
    }

    // 提取 code-store 返回的新 refresh token cookie（token 轮换）
    let newRefreshToken: string | undefined;
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookie) {
      const match = cookie.match(/^we29_refresh_token=([^;]+)/);
      if (match) {
        newRefreshToken = match[1];
        break;
      }
    }

    const data = (await res.json()) as {
      data: {
        token: string;
        user: { id: number; uid: string; username: string; role: string };
      };
    };

    const remoteUser = data.data.user;
    const username = remoteUser.uid || remoteUser.username;
    const role = this.mapRole(remoteUser.role);

    let user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      const randomPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString('base64url'),
        10,
      );
      user = this.userRepository.create({
        username,
        password: randomPassword,
        role,
      });
      await this.userRepository.save(user);
      this.logger.log(`Auto-login provisioned local user: ${username} (role: ${role})`);
    } else if (user.role !== role) {
      // 同步 code-store 侧的角色变更
      user.role = role;
      await this.userRepository.save(user);
    }

    return { ...this.issueLocalToken(user), newRefreshToken };
  }

  /**
   * 签发本地 JWT。仅在 shared cookie 验证通过后调用。
   */
  private issueLocalToken(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      username: user.username,
      role: user.role,
    };
  }

  /**
   * 将 code-store 的角色映射到 wei-pay 的角色体系。
   * code-store: user / admin / super_admin
   * wei-pay:    Admin / SuperAdmin
   */
  private mapRole(codeStoreRole: string): UserRole {
    if (codeStoreRole === 'super_admin') return UserRole.SuperAdmin;
    return UserRole.Admin;
  }
}
