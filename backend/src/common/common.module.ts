import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { NotifyQueue } from '../entities/notify-queue.entity';
import { PaymentOrder } from '../entities/payment-order.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { NotifyService } from './services/notify.service';
import { SignatureService } from './services/signature.service';
import { OrderNumberGenerator } from './services/order-number-generator.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { EncryptionService } from './services/encryption.service';
import { NonceStore } from './services/nonce-store.service';
import { FeeCalculator } from './services/fee-calculator.service';
import { AuditService } from './services/audit.service';
import { SandboxGuard } from './guards/sandbox.guard';
import { OrderCleanupTask } from './tasks/order-cleanup.task';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotifyQueue, PaymentOrder, AuditLog]),
    HttpModule,
  ],
  providers: [
    NotifyService,
    SignatureService,
    OrderNumberGenerator,
    ExchangeRateService,
    EncryptionService,
    NonceStore,
    FeeCalculator,
    AuditService,
    SandboxGuard,
    OrderCleanupTask,
  ],
  exports: [
    NotifyService,
    SignatureService,
    OrderNumberGenerator,
    ExchangeRateService,
    EncryptionService,
    NonceStore,
    FeeCalculator,
    AuditService,
    SandboxGuard,
  ],
})
export class CommonModule {}
