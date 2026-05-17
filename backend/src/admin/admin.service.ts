import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../entities/payment-order.entity';
import { Merchant } from '../entities/merchant.entity';
import { EncryptionService } from '../common/services/encryption.service';
import { AuditService } from '../common/services/audit.service';
import { toYuan } from '../common/money';
import * as crypto from 'crypto';
import { errMessage, errStack } from '../common/util/error';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private orderRepository: Repository<PaymentOrder>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  private generateSecret(): string {
    return crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  }

  async onModuleInit() {
    try {
      const count = await this.merchantRepository.count();
      if (count === 0) {
        const plainSecret = this.generateSecret();
        const merchant = this.merchantRepository.create({
          name: 'WeiPay Sandbox Merchant',
          appKey: 'wp_sandbox_' + crypto.randomBytes(6).toString('hex'),
          appSecret: this.encryptionService.encrypt(plainSecret),
          isActive: true,
        });
        await this.merchantRepository.save(merchant);
        this.logger.log('✅ 默认沙箱商户数据已同步至数据库');
      } else {
        this.logger.log('✅ 数据库已有商户记录，跳过初始化');
      }
    } catch (err: unknown) {
      this.logger.error('初始化商户数据失败: ' + errMessage(err), errStack(err));
    }
  }


  /**
   * Stats are computed via SQL aggregation rather than loading rows into memory,
   * so they remain O(1) on the app side regardless of order-table size.
   */
  async getStats(merchantId?: number) {
    const qb = this.orderRepository.createQueryBuilder('o');
    if (merchantId !== undefined) qb.where('o.merchantId = :merchantId', { merchantId });

    const totalCountRaw = await qb.clone().select('COUNT(*)', 'c').getRawOne<{ c: string }>();
    const totalCount = Number(totalCountRaw?.c ?? 0);

    const paidStats = await qb
      .clone()
      .select('COUNT(*)', 'c')
      .addSelect('COALESCE(SUM(o.amount), 0)', 's')
      .andWhere('o.status = :paid', { paid: OrderStatus.Paid })
      .getRawOne<{ c: string; s: string }>();

    const successCount = Number(paidStats?.c ?? 0);
    const totalAmount = Number(paidStats?.s ?? 0);

    // When no orders exist we deliberately surface a neutral placeholder so the
    // dashboard doesn't claim a fake "100% success rate" on an empty account.
    const successRate =
      totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) + '%' : '—';

    return {
      totalAmount: `￥${totalAmount.toFixed(2)}`,
      successCount: `${successCount} 笔`,
      successRate,
      rawAmount: totalAmount,
      rawSuccessCount: successCount,
      rawTotalCount: totalCount,
    };
  }

  async getTransactions(opts: { merchantId?: number; page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50));

    const qb = this.orderRepository
      .createQueryBuilder('o')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (opts.merchantId !== undefined) qb.where('o.merchantId = :merchantId', { merchantId: opts.merchantId });

    const [orders, total] = await qb.getManyAndCount();

    const items = orders.map(order => {
      let channel = 'ALIPAY';
      if (order.payMethod && order.payMethod.toUpperCase().includes('PAYPAL')) channel = 'PAYPAL';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('WECHAT')) channel = 'WECHAT';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('USDT')) channel = 'USDT';
      else if (order.payMethod && order.payMethod.toUpperCase().includes('NATIVE')) channel = 'NATIVE';
      else if (order.payMethod) channel = order.payMethod.toUpperCase();

      let status = 'PENDING';
      if (order.status === OrderStatus.Paid) status = 'SUCCESS';
      else if (order.status === OrderStatus.Failed || order.status === OrderStatus.Expired) status = 'FAILED';
      else if (order.status === OrderStatus.Refunding) status = 'REFUNDING';
      else if (order.status === OrderStatus.Refunded) status = 'REFUNDED';

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
        amount: toYuan(order.amount),
        refundedAmount: toYuan(order.refundedAmount),
        fee: toYuan(order.fee),
        settleAmount: toYuan(order.settleAmount),
        payMethod: order.payMethod,
        status,
        time,
        rawDate: order.createdAt,
      };
    });

    return { items, total, page, pageSize };
  }

  /**
   * Resolve the active merchant entity (creates a default one if the table
   * is empty). Returned as-is so callers needing the internal id can use it.
   */
  async findActiveMerchant(): Promise<Merchant> {
    let merchant = await this.merchantRepository.findOne({ where: {} });
    if (!merchant) {
      const plain = this.generateSecret();
      merchant = this.merchantRepository.create({
        name: 'WeiPay Sandbox Merchant',
        appKey: 'wp_sandbox_' + crypto.randomBytes(6).toString('hex'),
        appSecret: this.encryptionService.encrypt(plain),
        isActive: true,
      });
      await this.merchantRepository.save(merchant);
    }
    return merchant;
  }

  async getMerchant() {
    let merchant = await this.merchantRepository.findOne({ where: {} });
    if (!merchant) {
      const plain = this.generateSecret();
      merchant = this.merchantRepository.create({
        name: 'WeiPay Sandbox Merchant',
        appKey: 'wp_sandbox_' + crypto.randomBytes(6).toString('hex'),
        appSecret: this.encryptionService.encrypt(plain),
        isActive: true,
      });
      await this.merchantRepository.save(merchant);
    }
    return {
      appKey: merchant.appKey,
      // Decrypt for admin UI display. (UI should ideally show secret only on creation/reset.)
      appSecret: this.encryptionService.decrypt(merchant.appSecret),
      name: merchant.name,
    };
  }

  async resetSecret(actor: string = 'admin', ip?: string) {
    let merchant = await this.merchantRepository.findOne({ where: {} });
    if (!merchant) {
      return this.getMerchant();
    }
    const plain = this.generateSecret();
    merchant.appSecret = this.encryptionService.encrypt(plain);
    await this.merchantRepository.save(merchant);

    // The new plaintext secret is intentionally NOT logged here — only the
    // fact that a rotation happened. Caller receives the secret in the
    // response and is expected to handle it out-of-band.
    await this.auditService.log({
      action: 'reset_secret',
      actor,
      targetType: 'merchant',
      targetId: String(merchant.id),
      ip,
      detail: { appKey: merchant.appKey },
    });

    return {
      appKey: merchant.appKey,
      appSecret: plain,
      name: merchant.name,
    };
  }

  async deleteTransaction(orderNo: string, actor: string = 'admin', ip?: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.orderRepository.delete({ orderNo });

    await this.auditService.log({
      action: 'delete_order',
      actor,
      targetType: 'order',
      targetId: orderNo,
      ip,
      detail: { amount: order.amount, channel: order.payMethod, status: order.status },
    });

    this.logger.log(`Order ${orderNo} deleted by ${actor}`);
    return { success: true };
  }
}
