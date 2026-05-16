import { Controller, Post, Get, Body, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { MerchantSignatureGuard } from '../guards/merchant-signature.guard';
import { PaymentService } from '../../payment/services/payment.service';
import { PayPalService } from '../../payment/gateways/paypal.service';
import { AlipayService } from '../../payment/gateways/alipay.service';
import { NativePayService } from '../../payment/gateways/native-pay.service';
import { CreatePaymentDto } from '../../payment/dto/payment.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Gateway')
@Controller('api/gateway')
export class GatewayController {
  constructor(
    private paymentService: PaymentService,
    private paypalService: PayPalService,
    private alipayService: AlipayService,
    private nativePayService: NativePayService,
  ) {}

  @Post('pay')
  @UseGuards(MerchantSignatureGuard)
  @ApiOperation({ summary: 'Create a payment order and get payment URL' })
  @ApiHeader({ name: 'X-WeiPay-AppKey', required: true })
  @ApiHeader({ name: 'X-WeiPay-Timestamp', required: true })
  @ApiHeader({ name: 'X-WeiPay-Nonce', required: true })
  @ApiHeader({ name: 'X-WeiPay-Signature', required: true })
  async createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    const merchant = req.merchant;
    const order = await this.paymentService.createOrder(merchant.id, dto);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    switch (dto.payMethod) {
      case 'paypal':
        return this.paypalService.createOrder(order.orderNo, baseUrl);
      case 'alipay':
        return this.alipayService.createPagePay(order.orderNo, baseUrl);
      case 'native':
        return this.nativePayService.createOrder(order.orderNo, baseUrl);
      default:
        throw new BadRequestException(`Unsupported payment method: ${dto.payMethod}`);
    }
  }

  @Get('query')
  @UseGuards(MerchantSignatureGuard)
  @ApiOperation({ summary: 'Query order status by orderNo' })
  async queryOrder(@Request() req: any, @Query('orderNo') orderNo: string) {
    const merchant = req.merchant;
    return this.paymentService.queryByMerchant(merchant.id, orderNo);
  }
}
