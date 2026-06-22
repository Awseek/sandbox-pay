import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../entities/payment-order.entity';
import { Merchant } from '../entities/merchant.entity';
import { NotifyQueue } from '../entities/notify-queue.entity';
import { AuditLog } from '../entities/audit-log.entity';
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
    @InjectRepository(NotifyQueue)
    private notifyRepository: Repository<NotifyQueue>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  private generateSecret(): string {
    return crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  }

  /** Find the first merchant, or create a default sandbox one if none exists. */
  private async ensureMerchant(): Promise<Merchant> {
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

  async onModuleInit() {
    try {
      const count = await this.merchantRepository.count();
      if (count === 0) {
        await this.ensureMerchant();
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

  async getTransactions(opts: {
    merchantId?: number;
    page?: number;
    pageSize?: number;
    status?: string;
    payMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
  } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50));

    const qb = this.orderRepository
      .createQueryBuilder('o')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (opts.merchantId !== undefined) qb.andWhere('o.merchantId = :merchantId', { merchantId: opts.merchantId });
    if (opts.status) qb.andWhere('o.status = :status', { status: opts.status });
    if (opts.payMethod) qb.andWhere('o.payMethod = :payMethod', { payMethod: opts.payMethod });
    if (opts.dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom: new Date(opts.dateFrom) });
    if (opts.dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo: new Date(opts.dateTo + 'T23:59:59') });
    if (opts.keyword) {
      qb.andWhere('(o.orderNo LIKE :kw OR o.externalOrderNo LIKE :kw)', { kw: `%${opts.keyword}%` });
    }

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
    return this.ensureMerchant();
  }

  async getMerchant() {
    const merchant = await this.ensureMerchant();
    return {
      appKey: merchant.appKey,
      // Mask the secret — full value is only returned on reset-secret.
      appSecret: '••••••••••••••••••••••••••••',
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

  // ── Merchant CRUD ──────────────────────────────────────────────

  async listMerchants() {
    const merchants = await this.merchantRepository.find({ order: { id: 'ASC' } });
    return merchants.map(m => ({
      id: m.id,
      name: m.name,
      appKey: m.appKey,
      appSecret: '••••••••••••••••••••••••••••',
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  }

  async createMerchant(name: string, actor: string = 'admin', ip?: string) {
    if (!name || name.trim().length < 2) {
      throw new BadRequestException('商户名称至少 2 个字符');
    }
    const plain = this.generateSecret();
    const merchant = this.merchantRepository.create({
      name: name.trim(),
      appKey: 'wp_' + crypto.randomBytes(8).toString('hex'),
      appSecret: this.encryptionService.encrypt(plain),
      isActive: true,
    });
    await this.merchantRepository.save(merchant);

    await this.auditService.log({
      action: 'create_merchant',
      actor,
      targetType: 'merchant',
      targetId: String(merchant.id),
      ip,
      detail: { name: merchant.name, appKey: merchant.appKey },
    });

    return {
      id: merchant.id,
      name: merchant.name,
      appKey: merchant.appKey,
      appSecret: plain, // 返回一次明文，之后不再展示
      isActive: merchant.isActive,
    };
  }

  async updateMerchant(id: number, updates: { name?: string }, actor: string = 'admin', ip?: string) {
    const merchant = await this.merchantRepository.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('商户不存在');
    if (updates.name) merchant.name = updates.name.trim();
    await this.merchantRepository.save(merchant);

    await this.auditService.log({
      action: 'update_merchant',
      actor,
      targetType: 'merchant',
      targetId: String(id),
      ip,
      detail: updates,
    });

    return { id: merchant.id, name: merchant.name, appKey: merchant.appKey, isActive: merchant.isActive };
  }

  async toggleMerchantActive(id: number, actor: string = 'admin', ip?: string) {
    const merchant = await this.merchantRepository.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('商户不存在');
    merchant.isActive = !merchant.isActive;
    await this.merchantRepository.save(merchant);

    await this.auditService.log({
      action: merchant.isActive ? 'activate_merchant' : 'deactivate_merchant',
      actor,
      targetType: 'merchant',
      targetId: String(id),
      ip,
      detail: { isActive: merchant.isActive },
    });

    return { id: merchant.id, name: merchant.name, isActive: merchant.isActive };
  }

  // ── Notification Status ────────────────────────────────────────

  async getNotificationStatus(opts: { page?: number; pageSize?: number; status?: string } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50));

    const qb = this.notifyRepository
      .createQueryBuilder('n')
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (opts.status) qb.andWhere('n.status = :status', { status: Number(opts.status) });

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map(n => ({
        id: n.id,
        orderNo: n.orderNo,
        url: n.url,
        status: n.status, // 0=Pending, 1=Success, 2=Failed, 3=Exhausted
        retryCount: n.retryCount,
        lastError: n.lastError,
        lastAttemptAt: n.lastAttemptAt,
        createdAt: n.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async replayNotification(id: number, actor: string = 'admin', ip?: string) {
    const notify = await this.notifyRepository.findOne({ where: { id } });
    if (!notify) throw new NotFoundException('通知记录不存在');
    notify.status = 0 as any; // Reset to Pending
    notify.retryCount = 0;
    notify.lastAttemptAt = new Date();
    notify.lastError = undefined;
    await this.notifyRepository.save(notify);

    await this.auditService.log({
      action: 'replay_notification',
      actor,
      targetType: 'notification',
      targetId: String(id),
      ip,
      detail: { orderNo: notify.orderNo },
    });

    return { success: true, id, orderNo: notify.orderNo };
  }

  // ── Data Reset (Sandbox) ───────────────────────────────────────

  async resetData(actor: string = 'admin', ip?: string) {
    const orderCount = await this.orderRepository.count();
    const notifyCount = await this.notifyRepository.count();
    const auditCount = await this.auditRepository.count();

    await this.orderRepository.delete({});
    await this.notifyRepository.delete({});
    await this.auditRepository.delete({});

    this.logger.warn(`Data reset by ${actor}: ${orderCount} orders, ${notifyCount} notifications, ${auditCount} audit logs deleted`);

    return {
      deleted: {
        orders: orderCount,
        notifications: notifyCount,
        auditLogs: auditCount,
      },
    };
  }
}
