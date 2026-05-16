import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class NativePayService {
  private readonly logger = new Logger(NativePayService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    private configService: ConfigService,
    private paymentService: PaymentService,
  ) {}

  /**
   * 创建自有支付订单，返回收银台页面 URL
   */
  async createOrder(orderNo: string, baseUrl: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== OrderStatus.Pending) throw new BadRequestException('Order not pending');

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || baseUrl;
    const cashierUrl = `${frontendUrl}/cashier?orderNo=${orderNo}`;

    this.logger.log(`Native pay cashier URL generated for order: ${orderNo}`);
    return { type: 'url', data: cashierUrl };
  }

  /**
   * 获取收银台所需的支付信息
   */
  async getCashierInfo(orderNo: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new NotFoundException('订单不存在');

    if (order.status === OrderStatus.Paid) {
      return {
        orderNo: order.orderNo,
        amount: Number(order.amount),
        productName: order.productName,
        status: 'paid',
        payAt: order.payAt,
      };
    }

    if (order.status === OrderStatus.Expired || order.status === OrderStatus.Failed) {
      return {
        orderNo: order.orderNo,
        amount: Number(order.amount),
        productName: order.productName,
        status: order.status === OrderStatus.Expired ? 'expired' : 'failed',
      };
    }

    // 检查是否过期
    if (new Date() > new Date(order.expireAt)) {
      return {
        orderNo: order.orderNo,
        amount: Number(order.amount),
        productName: order.productName,
        status: 'expired',
      };
    }

    return {
      orderNo: order.orderNo,
      amount: Number(order.amount),
      productName: order.productName,
      status: 'pending',
      expireAt: order.expireAt,
      paymentInfo: {
        qrCodeUrl: this.configService.get<string>('NATIVE_PAY_QR_URL', ''),
        accountName: this.configService.get<string>('NATIVE_PAY_ACCOUNT_NAME', 'WeiPay Official'),
        accountNo: this.configService.get<string>('NATIVE_PAY_ACCOUNT_NO', ''),
        bankName: this.configService.get<string>('NATIVE_PAY_BANK_NAME', ''),
        remark: `WP${orderNo}`,
      },
    };
  }

  /**
   * 管理员手动确认收款
   */
  async confirmPayment(orderNo: string, tradeNo?: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.Pending) {
      throw new BadRequestException(`订单状态不正确，当前状态: ${order.status}`);
    }

    const confirmedTradeNo = tradeNo || `NATIVE_${Date.now()}`;
    await this.paymentService.markPaid(orderNo, confirmedTradeNo);

    this.logger.log(`Native payment manually confirmed: ${orderNo}, tradeNo: ${confirmedTradeNo}`);
    return { success: true, orderNo, tradeNo: confirmedTradeNo };
  }
}
