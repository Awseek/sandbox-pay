import { Injectable, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.userRepository.count();
      if (count === 0) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        const admin = this.userRepository.create({
          username: 'admin',
          password: hashedPassword,
          role: UserRole.SuperAdmin,
        });
        await this.userRepository.save(admin);
        this.logger.log('✅ 默认管理员数据已同步至数据库: admin / 123456');
      } else {
        this.logger.log('✅ 数据库已有用户记录，跳过初始化');
      }
    } catch (err: any) {
      this.logger.error('初始化管理员数据失败: ' + err.message, err.stack);
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordMatching = await bcrypt.compare(dto.password || '', user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      username: user.username,
      role: user.role,
    };
  }

  /**
   * 同步登录：验证 we29.cn 账号，自动同步到本地
   */
  async syncLogin(dto: LoginDto) {
    // 1. SSO 模式：只有用户名，无密码
    if (!dto.password) {
      let user = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (!user) {
        // 自动创建用户
        const randomPassword = Math.random().toString(36).substring(7);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = this.userRepository.create({
          username: dto.username,
          password: hashedPassword,
          role: UserRole.Admin,
        });
        await this.userRepository.save(user);
        this.logger.log(`SSO 同步创建用户: ${dto.username}`);
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

    // 2. 本地登录
    const localUser = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (localUser) {
      const isPasswordMatching = await bcrypt.compare(dto.password, localUser.password);
      if (isPasswordMatching) {
        const payload = { sub: localUser.id, username: localUser.username, role: localUser.role };
        return {
          token: this.jwtService.sign(payload),
          tokenType: 'Bearer',
          username: localUser.username,
          role: localUser.role,
          source: 'local',
        };
      }
    }

    // 3. 本地没有或密码不对，尝试 we29.cn 验证
    try {
      const we29Res = await fetch('https://we29.cn/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: dto.username, password: dto.password }),
      });
      const we29Data = await we29Res.json();

      if (we29Data.code === 200 && we29Data.data?.token) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        let syncedUser = localUser;
        if (!syncedUser) {
          syncedUser = this.userRepository.create({
            username: dto.username,
            password: hashedPassword,
            role: UserRole.Admin,
          });
        } else {
          syncedUser.password = hashedPassword;
        }
        await this.userRepository.save(syncedUser);

        const payload = { sub: syncedUser.id, username: syncedUser.username, role: syncedUser.role };
        return {
          token: this.jwtService.sign(payload),
          tokenType: 'Bearer',
          username: syncedUser.username,
          role: syncedUser.role,
          source: 'we29_synced',
        };
      }
    } catch (err: any) {
      this.logger.warn(`we29.cn 同步登录失败: ${err.message}`);
    }

    throw new UnauthorizedException('用户名或密码错误');
  }

}