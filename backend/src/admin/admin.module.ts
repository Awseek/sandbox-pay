import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentOrder } from '../entities/payment-order.entity';
import { Merchant } from '../entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentOrder, Merchant])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
