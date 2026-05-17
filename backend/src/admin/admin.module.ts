import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReconciliationService } from './reconciliation.service';
import { PaymentOrder } from '../entities/payment-order.entity';
import { Merchant } from '../entities/merchant.entity';
import { ReconciliationRecord } from '../entities/reconciliation-record.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, Merchant, ReconciliationRecord]),
    // Admin refund endpoint needs PaymentService / AlipayService / PayPalService.
    // Use forwardRef to avoid a circular dependency at module-resolution time.
    forwardRef(() => PaymentModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, ReconciliationService],
  exports: [AdminService, ReconciliationService],
})
export class AdminModule {}
