import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { NotifyQueue } from '../entities/notify-queue.entity';
import { PaymentOrder } from '../entities/payment-order.entity';
import { NotifyService } from './services/notify.service';
import { SignatureService } from './services/signature.service';
import { OrderNumberGenerator } from './services/order-number-generator.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { OrderCleanupTask } from './tasks/order-cleanup.task';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotifyQueue, PaymentOrder]),
    HttpModule,
  ],
  providers: [
    NotifyService,
    SignatureService,
    OrderNumberGenerator,
    ExchangeRateService,
    OrderCleanupTask,
  ],
  exports: [
    NotifyService,
    SignatureService,
    OrderNumberGenerator,
    ExchangeRateService,
  ],
})
export class CommonModule {}
