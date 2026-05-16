import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { Merchant } from '../../entities/merchant.entity';
import { CreatePaymentDto } from '../dto/payment.dto';
import { OrderNumberGenerator } from '../../common/services/order-number-generator.service';
import { NotifyService, PaymentNotification } from '../../common/services/notify.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private orderNumberGenerator: OrderNumberGenerator,
    private notifyService: NotifyService,
  ) {}

  async createOrder(merchantId: number, dto: CreatePaymentDto) {
    const existingOrder = await this.orderRepository.findOne({
      where: {
        merchantId,
        status: OrderStatus.Pending,
        amount: dto.amount,
        productName: dto.productName,
        externalOrderNo: dto.externalOrderNo,
        expireAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingOrder) {
      if (existingOrder.payMethod !== dto.payMethod) {
        existingOrder.payMethod = dto.payMethod;
        await this.orderRepository.save(existingOrder);
      }
      return this.buildOrderResult(existingOrder);
    }

    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 30);

    const order = this.orderRepository.create({
      id: uuidv4().replace(/-/g, ''),
      orderNo: this.orderNumberGenerator.create('PAY'),
      amount: dto.amount,
      productName: dto.productName,
      payMethod: dto.payMethod,
      externalOrderNo: dto.externalOrderNo,
      returnUrl: dto.returnUrl,
      notifyUrl: dto.notifyUrl,
      merchantId,
      userId: 1,
      status: OrderStatus.Pending,
      expireAt,
    });

    await this.orderRepository.save(order);
    return this.buildOrderResult(order);
  }

  async queryOrder(orderNo: string) {
    const order = await this.orderRepository.findOne({
      where: { orderNo },
      relations: ['merchant'],
    });
    if (!order) throw new NotFoundException('订单不存在');

    return {
      orderNo: order.orderNo,
      externalOrderNo: order.externalOrderNo,
      amount: Number(order.amount),
      status: order.status,
      payMethod: order.payMethod,
      productName: order.productName,
      payAt: order.payAt,
      thirdPartyTradeNo: order.thirdPartyTradeNo,
      createdAt: order.createdAt,
      expireAt: order.expireAt,
    };
  }

  async queryByMerchant(merchantId: number, orderNo: string) {
    const order = await this.orderRepository.findOne({
      where: { orderNo, merchantId },
    });
    if (!order) throw new NotFoundException('订单不存在');

    return {
      orderNo: order.orderNo,
      externalOrderNo: order.externalOrderNo,
      amount: Number(order.amount),
      status: order.status,
      payMethod: order.payMethod,
      productName: order.productName,
      payAt: order.payAt,
      thirdPartyTradeNo: order.thirdPartyTradeNo,
      createdAt: order.createdAt,
      expireAt: order.expireAt,
    };
  }

  async markPaid(orderNo: string, thirdPartyTradeNo?: string) {
    const order = await this.orderRepository.findOne({
      where: { orderNo },
      relations: ['merchant'],
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.Pending) {
      this.logger.warn(`Order ${orderNo} already in status ${order.status}, skip`);
      return order;
    }

    order.status = OrderStatus.Paid;
    order.payAt = new Date();
    order.thirdPartyTradeNo = thirdPartyTradeNo;
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderNo} marked as paid`);

    if (order.notifyUrl && order.merchant) {
      const notification: PaymentNotification = {
        orderNo: order.orderNo,
        externalOrderNo: order.externalOrderNo,
        status: 'paid',
        amount: Number(order.amount),
        payMethod: order.payMethod,
        payAt: order.payAt.toISOString(),
        thirdPartyTradeNo,
      };
      await this.notifyService.enqueueNotification(
        order.notifyUrl,
        notification,
        order.merchant.appSecret,
      );
    }

    return order;
  }

  async markFailed(orderNo: string, reason?: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.Pending) return order;

    order.status = OrderStatus.Failed;
    await this.orderRepository.save(order);
    this.logger.log(`Order ${orderNo} marked as failed: ${reason}`);
    return order;
  }

  private buildOrderResult(order: PaymentOrder) {
    return {
      orderNo: order.orderNo,
      amount: Number(order.amount),
      expireAt: order.expireAt,
    };
  }
}
