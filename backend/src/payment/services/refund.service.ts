import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder, OrderStatus } from '../../entities/payment-order.entity';
import { PaymentService } from './payment.service';
import { AlipayService } from '../gateways/alipay.service';
import { PayPalService } from '../gateways/paypal.service';
import { AuditService } from '../../common/services/audit.service';
import { RefundDto } from '../dto/payment.dto';
import { yuanStringToCents } from '../../common/money';

export interface RefundOptions {
  /** When provided, scope the order lookup to this merchant (gateway path). */
  merchantId?: number;
  /** Audit-log actor string. */
  actor: string;
  /** Optional client IP for the audit log. */
  ip?: string;
}

export interface RefundResult {
  orderNo: string;
  refundedAmount: number;
  refundTradeNo: string;
  currency: string;
}

/**
 * Channel-agnostic refund orchestration.
 *
 * Both `/api/gateway/refund` (merchant-signed) and `/api/admin/refund` (JWT)
 * share this flow: validate balance → mark refunding → dispatch to upstream
 * gateway → mark refunded → audit. Differences between the two callers are
 * captured via {@link RefundOptions}.
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly orderRepository: Repository<PaymentOrder>,
    private readonly paymentService: PaymentService,
    private readonly alipayService: AlipayService,
    private readonly paypalService: PayPalService,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: RefundDto, opts: RefundOptions): Promise<RefundResult> {
    if (!dto?.orderNo || !dto?.amount) {
      throw new BadRequestException('orderNo and amount are required');
    }

    const order = await this.lookupOrder(dto.orderNo, opts.merchantId);

    const refundCents = yuanStringToCents(dto.amount);
    const remainingCents = order.amount - (order.refundedAmount || 0);
    if (refundCents - remainingCents > 1) {
      throw new BadRequestException(
        `Refund amount ${dto.amount} exceeds refundable balance ${(remainingCents / 100).toFixed(2)}`,
      );
    }

    await this.paymentService.markRefunding(dto.orderNo);

    const { refundTradeNo, currency } = await this.dispatch(order, refundCents, dto.reason);
    if (!refundTradeNo) {
      throw new BadRequestException('Refund failed at upstream gateway');
    }

    await this.paymentService.markRefunded(
      dto.orderNo,
      refundCents,
      refundTradeNo,
      opts.merchantId,
    );

    // Audit AFTER the refund is fully durable. AuditService swallows its own
    // errors, so a logging failure won't roll back the refund.
    await this.auditService.log({
      action: 'refund',
      actor: opts.actor,
      targetType: 'order',
      targetId: dto.orderNo,
      ip: opts.ip,
      detail: {
        amount: dto.amount,
        currency,
        payMethod: order.payMethod,
        refundTradeNo,
        reason: dto.reason,
      },
    });

    return {
      orderNo: dto.orderNo,
      refundedAmount: dto.amount,
      refundTradeNo,
      currency,
    };
  }

  /**
   * Resolve the order to refund. When called via the merchant gateway the
   * lookup is scoped to the caller's `merchantId`; the admin path uses an
   * un-scoped lookup so the dashboard can refund any merchant.
   */
  private async lookupOrder(orderNo: string, merchantId?: number): Promise<PaymentOrder> {
    if (merchantId !== undefined) {
      return this.paymentService.getOrderForRefund(orderNo, merchantId);
    }
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.Paid) {
      throw new BadRequestException(`订单状态不允许退款: ${order.status}`);
    }
    return order;
  }

  /**
   * Invoke the channel-specific refund API. Returns the upstream refund
   * trade-no and the currency the refund was settled in.
   */
  private async dispatch(
    order: PaymentOrder,
    refundCents: number,
    reason?: string,
  ): Promise<{ refundTradeNo: string | null; currency: string }> {
    switch (order.payMethod) {
      case 'alipay': {
        const tradeNo = await this.alipayService.refund(order.orderNo, refundCents, reason);
        return { refundTradeNo: tradeNo, currency: 'CNY' };
      }
      case 'paypal': {
        if (!order.thirdPartyTradeNo) {
          throw new BadRequestException('PayPal captureId missing on order — cannot refund');
        }
        const currency = order.foreignCurrency || 'USD';
        // For PayPal we refund in the foreign currency (USD cents). For partial
        // refunds we assume `dto.amount` is in the original CNY yuan; pro-rate
        // to USD cents using the rate captured on the order.
        const paypalRefundCents =
          order.foreignAmount && order.amount
            ? Math.round((refundCents / order.amount) * order.foreignAmount)
            : refundCents;
        const tradeNo = await this.paypalService.refund(
          order.thirdPartyTradeNo,
          paypalRefundCents,
          currency,
          reason,
        );
        return { refundTradeNo: tradeNo, currency };
      }
      case 'native':
        // Self-custody channel: trust admin / accounting to mirror funds out-of-band.
        return { refundTradeNo: `WP_REFUND_${Date.now()}`, currency: 'CNY' };
      default:
        throw new BadRequestException(`Unsupported payMethod for refund: ${order.payMethod}`);
    }
  }
}
