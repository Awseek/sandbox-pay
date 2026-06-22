import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Per-channel fee model.
 *
 * Configured via env (rates expressed as decimals, e.g. 0.006 = 0.6%):
 *   - FEE_RATE_ALIPAY        merchant-facing rate
 *   - FEE_RATE_PAYPAL
 *   - FEE_RATE_NATIVE
 *   - CHANNEL_COST_ALIPAY    cost charged by the upstream PSP
 *   - CHANNEL_COST_PAYPAL
 *   - CHANNEL_COST_NATIVE
 *   - FEE_MIN_CENTS          floor per transaction (defaults to 0)
 *
 * All inputs and outputs are integer cents. `fee` and `channelCost` are computed
 * independently — `fee - channelCost` is WeiPay's gross margin per order.
 */
@Injectable()
export class FeeCalculator {
  constructor(private readonly configService: ConfigService) {}

  calculate(payMethod: string, amountCents: number): { fee: number; channelCost: number; settleAmount: number } {
    const method = (payMethod || '').toLowerCase();
    const feeRate = this.getNumber(`FEE_RATE_${method.toUpperCase()}`, defaultFeeRates[method] ?? 0);
    const costRate = this.getNumber(
      `CHANNEL_COST_${method.toUpperCase()}`,
      defaultChannelCosts[method] ?? 0,
    );
    const floor = this.getNumber('FEE_MIN_CENTS', 0);

    const fee = Math.max(Math.round(amountCents * feeRate), Math.round(floor));
    const channelCost = Math.round(amountCents * costRate);
    const settleAmount = Math.max(0, amountCents - fee);
    return { fee, channelCost, settleAmount };
  }

  private getNumber(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
}

// Sensible defaults if env is not configured. Numbers reflect approximate market rates.
const defaultFeeRates: Record<string, number> = {
  alipay: 0.006, // 0.6%
  paypal: 0.044, // 4.4% baseline (PayPal cross-border)
  native: 0.0,   // self-custody → no fee
};

const defaultChannelCosts: Record<string, number> = {
  alipay: 0.006,
  paypal: 0.044,
  native: 0.0,
};
