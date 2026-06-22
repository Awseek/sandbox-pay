import { Controller, Get, Query, Response, Logger } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { PayPalService } from '../gateways/paypal.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('PayPal')
@Controller('api/paypal')
export class PayPalController {
  private readonly logger = new Logger(PayPalController.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    private paypalService: PayPalService,
    private configService: ConfigService,
  ) {}

  @Get('callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'PayPal return callback - capture and redirect' })
  async callback(
    @Query('orderNo') orderNo: string,
    @Query('token') token: string,
    @Query('cancel') cancel: string,
    @Response() res: ExpressResponse,
  ) {
    if (!orderNo) return res.redirect('/?error=missing_order_no');

    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) return res.redirect('/?error=order_not_found');

    const clientUrl = this.configService.get<string>('CLIENT_URL') || '';
    const defaultReturnUrl = clientUrl ? `${clientUrl}/cashier` : '/cashier';
    const returnUrl = order.returnUrl || defaultReturnUrl;

    if (cancel) {
      return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'cancelled'));
    }

    // Only capture if order is still pending — prevents duplicate captures
    if (order.status !== OrderStatus.Pending) {
      this.logger.warn(`PayPal callback for non-pending order ${orderNo} (status: ${order.status}), skipping capture`);
      return res.redirect(this.buildReturnUrl(returnUrl, orderNo, order.status === OrderStatus.Paid ? 'success' : 'failed'));
    }

    if (token) {
      try {
        const result = await this.paypalService.captureOrder(orderNo, token);
        if (result.success) {
          return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'success'));
        }
      } catch (err: unknown) {
        this.logger.error(`PayPal capture failed for ${orderNo}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'failed'));
  }

  private buildReturnUrl(returnUrl: string, orderNo: string, status: string): string {
    const separator = returnUrl.includes('?') ? '&' : '?';
    return `${returnUrl}${separator}orderNo=${orderNo}&status=${status}`;
  }
}
