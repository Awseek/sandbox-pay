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

    const isPasswordMatching = await bcrypt.compare(dto.password, user.password);
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
}

