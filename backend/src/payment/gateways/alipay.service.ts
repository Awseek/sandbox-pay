import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlipaySdk } from 'alipay-sdk';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private readonly alipaySdk: AlipaySdk;

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    private configService: ConfigService,
    private paymentService: PaymentService,
  ) {
    this.alipaySdk = new AlipaySdk({
      appId: this.configService.get<string>('ALIPAY_APP_ID')!,
      privateKey: this.configService.get<string>('ALIPAY_PRIVATE_KEY')!,
      alipayPublicKey: this.configService.get<string>('ALIPAY_PUBLIC_KEY')!,
      gateway: this.configService.get<string>('ALIPAY_SERVER_URL')!,
    });
  }

  async createPagePay(orderNo: string, baseUrl: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== OrderStatus.Pending) throw new BadRequestException('Order not pending');

    const notifyUrl = `${baseUrl}/api/alipay/notify`;
    const returnUrl = order.returnUrl
      ? `${order.returnUrl}${order.returnUrl.includes('?') ? '&' : '?'}orderNo=${orderNo}`
      : `${baseUrl}/`;

    try {
      const result = this.alipaySdk.pageExec('alipay.trade.page.pay', {
        notify_url: notifyUrl,
        return_url: returnUrl,
        biz_content: {
          out_trade_no: order.orderNo,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: Number(order.amount).toFixed(2),
          subject: order.productName,
        },
      });

      this.logger.log(`Alipay page pay form generated for order: ${orderNo}`);
      return { type: 'form', data: result };
    } catch (error) {
      this.logger.error(`Alipay page pay error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate Alipay payment form');
    }
  }

  async handleNotify(params: any) {
    const isValid = await this.alipaySdk.checkNotifySign(params);
    if (!isValid) {
      this.logger.warn('Alipay notify signature verification failed');
      return 'failure';
    }

    const { out_trade_no, trade_no, trade_status } = params;
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.paymentService.markPaid(out_trade_no, trade_no);
      this.logger.log(`Alipay payment success: ${out_trade_no}, trade_no: ${trade_no}`);
    }

    return 'success';
  }
}
