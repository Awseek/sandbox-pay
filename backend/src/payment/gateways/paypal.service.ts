import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { ExchangeRateService } from '../../common/services/exchange-rate.service';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private client: any;

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    private configService: ConfigService,
    private exchangeRateService: ExchangeRateService,
    private paymentService: PaymentService,
  ) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET')!;
    const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createOrder(orderNo: string, baseUrl: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new BadRequestException('Order not found');

    const rate = await this.exchangeRateService.getCnyToUsdRateAsync();
    const usdAmount = Number(order.amount) * rate;

    order.exchangeRate = rate;
    order.foreignAmount = usdAmount;
    order.foreignCurrency = 'USD';
    await this.orderRepository.save(order);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: usdAmount.toFixed(2),
        },
        description: order.productName,
        reference_id: order.orderNo,
      }],
      application_context: {
        return_url: `${baseUrl}/api/paypal/callback?orderNo=${order.orderNo}`,
        cancel_url: `${baseUrl}/api/paypal/callback?orderNo=${order.orderNo}&cancel=1`,
      },
    });

    try {
      const response = await this.client.execute(request);
      const approveUrl = response.result.links.find((link: any) => link.rel === 'approve').href;
      return { type: 'url', data: approveUrl };
    } catch (error) {
      this.logger.error(`PayPal order creation failed: ${error.message}`, error.stack);
      throw new BadRequestException('PayPal integration failed');
    }
  }

  async captureOrder(orderNo: string, token: string) {
    const request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({} as any);

    try {
      const response = await this.client.execute(request);
      if (response.result.status === 'COMPLETED') {
        const captureId = response.result.purchase_units[0].payments.captures[0].id;
        await this.paymentService.markPaid(orderNo, captureId);
        this.logger.log(`PayPal order ${orderNo} captured: ${captureId}`);
        return { success: true, captureId };
      }
      await this.paymentService.markFailed(orderNo, 'PayPal capture not completed');
      return { success: false };
    } catch (error) {
      this.logger.error(`PayPal capture failed for ${orderNo}: ${error.message}`, error.stack);
      await this.paymentService.markFailed(orderNo, error.message);
      return { success: false, error: error.message };
    }
  }
}
