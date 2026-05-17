import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entities
import { User } from './entities/user.entity';
import { Merchant } from './entities/merchant.entity';
import { PaymentOrder } from './entities/payment-order.entity';
import { NotifyQueue } from './entities/notify-queue.entity';
import { ReconciliationRecord } from './entities/reconciliation-record.entity';
import { AuditLog } from './entities/audit-log.entity';

// Modules
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { GatewayModule } from './gateway/gateway.module';
import { AdminModule } from './admin/admin.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global rate limiting: 60 req / 60 s per IP by default; overridable per-route via @Throttle()
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => [
        {
          ttl: Number(cs.get('THROTTLE_TTL_MS', 60_000)),
          limit: Number(cs.get('THROTTLE_LIMIT', 60)),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User, Merchant, PaymentOrder, NotifyQueue, ReconciliationRecord, AuditLog],
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    CommonModule,
    AuthModule,
    PaymentModule,
    GatewayModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
