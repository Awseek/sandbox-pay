import { Controller, Get, Query, Response } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder } from '../../entities/payment-order.entity';
import { PayPalService } from '../gateways/paypal.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('PayPal')
@Controller('api/paypal')
export class PayPalController {
  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    private paypalService: PayPalService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: 'PayPal return callback - capture and redirect' })
  async callback(
    @Query('orderNo') orderNo: string,
    @Query('token') token: string,
    @Query('cancel') cancel: string,
    @Response() res: any,
  ) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) return res.redirect('/?error=order_not_found');

    const returnUrl = order.returnUrl || '/';

    if (cancel) {
      return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'cancelled'));
    }

    if (token) {
      const result = await this.paypalService.captureOrder(orderNo, token);
      if (result.success) {
        return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'success'));
      }
    }

    return res.redirect(this.buildReturnUrl(returnUrl, orderNo, 'failed'));
  }

  private buildReturnUrl(returnUrl: string, orderNo: string, status: string): string {
    const separator = returnUrl.includes('?') ? '&' : '?';
    return `${returnUrl}${separator}orderNo=${orderNo}&status=${status}`;
  }
}
