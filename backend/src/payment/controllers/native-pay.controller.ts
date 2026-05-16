import { Controller, Get, Post, Query, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { NativePayService } from '../gateways/native-pay.service';
import { PaymentService } from '../services/payment.service';
import { Merchant } from '../../entities/merchant.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import * as crypto from 'crypto';

@ApiTags('NativePay')
@Controller('api/native-pay')
export class NativePayController {
  constructor(
    private nativePayService: NativePayService,
    private paymentService: PaymentService,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  @Get('cashier')
  @ApiOperation({ summary: 'Get cashier page payment info for native pay' })
  async getCashierInfo(@Query('orderNo') orderNo: string) {
    return this.nativePayService.getCashierInfo(orderNo);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Admin manually confirm payment received' })
  async confirmPayment(@Body() body: { orderNo: string; tradeNo?: string }) {
    return this.nativePayService.confirmPayment(body.orderNo, body.tradeNo);
  }

  @Post('test-pay')
  @ApiOperation({ summary: 'Quick test pay entry without signature for demo' })
  async testPay(@Body() body: { amount?: number; productName?: string }, @Req() req: Request) {
    try {
      let merchant = await this.merchantRepository.findOne({ where: {} });
      if (!merchant) {
        merchant = this.merchantRepository.create({
          name: 'WeiPay Demo Merchant',
          appKey: 'wp_demo_' + crypto.randomBytes(6).toString('hex'),
          appSecret: crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex'),
          isActive: true,
        });
        await this.merchantRepository.save(merchant);
      }

      const amount = Number(body.amount || 88.88);
      const productName = body.productName || '自有兜底支付体验商品 (Demo)';

      const orderResult = await this.paymentService.createOrder(merchant.id, {
        amount,
        productName,
        payMethod: 'native',
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return await this.nativePayService.createOrder(orderResult.orderNo, baseUrl);
    } catch (err: any) {
      console.error('TestPay Error Stack:', err);
      throw new BadRequestException(`TestPay Error: ${err.message || err}`);
    }
  }
}

