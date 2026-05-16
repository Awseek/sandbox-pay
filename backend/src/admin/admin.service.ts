import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../entities/payment-order.entity';
import { Merchant } from '../entities/merchant.entity';
import * as crypto from 'crypto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.merchantRepository.count();
      if (count === 0) {
        const merchant = this.merchantRepository.create({
          name: 'WeiPay Sandbox Merchant',
          appKey: 'wp_sandbox_' + crypto.randomBytes(6).toString('hex'),
          appSecret: crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex'),
          isActive: true,
        });
        await this.merchantRepository.save(merchant);
        this.logger.log('✅ 默认沙箱商户数据已同步至数据库');
      } else {
        this.logger.log('✅ 数据库已有商户记录，跳过初始化');
      }
    } catch (err: any) {
      this.logger.error('初始化商户数据失败: ' + err.message, err.stack);
    }
  }


  async getStats() {
    const orders = await this.orderRepository.find();
    
    let totalAmount = 0;
    let successCount = 0;
    const totalCount = orders.length;

    for (const order of orders) {
      if (order.status === OrderStatus.Paid) {
        totalAmount += Number(order.amount);
        successCount++;
      }
    }

    const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) + '%' : '100.0%';

    return {
      totalAmount: `￥${totalAmount.toFixed(2)}`,
      successCount: `${successCount} 笔`,
      routingCount: '5 节点',
      successRate,
      rawAmount: totalAmount,
      rawSuccessCount: successCount,
    };
  }

  async getTransactions() {
    const orders = await this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return orders.map(order => {
      let channel = 'ALIPAY';
      if (order.payMethod && order.payMethod.toUpperCase().includes('PAYPAL')) channel = 'PAYPAL';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('WECHAT')) channel = 'WECHAT';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('USDT')) channel = 'USDT';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('NATIVE')) channel = 'NATIVE';
      else if (order.payMethod) channel = order.payMethod.toUpperCase();

      let status = 'PENDING';
      if (order.status === OrderStatus.Paid) status = 'SUCCESS';
      else if (order.status === OrderStatus.Failed || order.status === OrderStatus.Expired) status = 'FAILED';

      const diffMs = Date.now() - new Date(order.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let time = '刚刚';
      if (diffDays > 0) time = `${diffDays} 天前`;
      else if (diffHours > 0) time = `${diffHours} 小时前`;
      else if (diffMins > 0) time = `${diffMins} 分钟前`;

      return {
        id: order.id,
        orderNo: order.orderNo,
        channel,
        amount: Number(order.amount),
        status,
        time,
        rawDate: order.createdAt,
      };
    });
  }

  async getMerchant() {
    let merchant = await this.merchantRepository.findOne({ where: {} });
    if (!merchant) {
      merchant = this.merchantRepository.create({
        name: 'WeiPay Sandbox Merchant',
        appKey: 'wp_sandbox_' + crypto.randomBytes(6).toString('hex'),
        appSecret: crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex'),
        isActive: true,
      });
      await this.merchantRepository.save(merchant);
    }
    return {
      appKey: merchant.appKey,
      appSecret: merchant.appSecret,
      name: merchant.name,
    };
  }

  async resetSecret() {
    let merchant = await this.merchantRepository.findOne({ where: {} });
    if (!merchant) {
      return this.getMerchant();
    }
    merchant.appSecret = crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex');
    await this.merchantRepository.save(merchant);
    return {
      appKey: merchant.appKey,
      appSecret: merchant.appSecret,
      name: merchant.name,
    };
  }
}
