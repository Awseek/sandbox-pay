import { ConfigService } from '@nestjs/config';
import { FeeCalculator } from './fee-calculator.service';

function createCalculator(env: Record<string, string> = {}): FeeCalculator {
  const configService = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new FeeCalculator(configService);
}

describe('FeeCalculator', () => {
  describe('calculate', () => {
    it('calculates alipay fee at default 0.6%', () => {
      const calc = createCalculator();
      const result = calc.calculate('alipay', 10000); // 100 yuan = 10000 cents

      expect(result.fee).toBe(60); // 0.6% of 10000
      expect(result.channelCost).toBe(60);
      expect(result.settleAmount).toBe(9940); // 10000 - 60
    });

    it('calculates paypal fee at default 4.4%', () => {
      const calc = createCalculator();
      const result = calc.calculate('paypal', 10000);

      expect(result.fee).toBe(440); // 4.4% of 10000
      expect(result.channelCost).toBe(440);
      expect(result.settleAmount).toBe(9560);
    });

    it('calculates native fee at default 0%', () => {
      const calc = createCalculator();
      const result = calc.calculate('native', 10000);

      expect(result.fee).toBe(0);
      expect(result.channelCost).toBe(0);
      expect(result.settleAmount).toBe(10000);
    });

    it('uses custom rates from env', () => {
      const calc = createCalculator({
        FEE_RATE_ALIPAY: '0.01', // 1%
        CHANNEL_COST_ALIPAY: '0.008', // 0.8%
      });
      const result = calc.calculate('alipay', 10000);

      expect(result.fee).toBe(100); // 1% of 10000
      expect(result.channelCost).toBe(80); // 0.8% of 10000
      expect(result.settleAmount).toBe(9900); // 10000 - 100
    });

    it('applies minimum fee floor', () => {
      const calc = createCalculator({ FEE_MIN_CENTS: '50' });
      const result = calc.calculate('native', 100); // 1 yuan, 0% rate → 0 fee

      expect(result.fee).toBe(50); // floor kicks in
      expect(result.settleAmount).toBe(50); // 100 - 50
    });

    it('handles unknown pay method gracefully', () => {
      const calc = createCalculator();
      const result = calc.calculate('unknown', 10000);

      expect(result.fee).toBe(0);
      expect(result.channelCost).toBe(0);
      expect(result.settleAmount).toBe(10000);
    });

    it('handles zero amount', () => {
      const calc = createCalculator();
      const result = calc.calculate('alipay', 0);

      expect(result.fee).toBe(0);
      expect(result.channelCost).toBe(0);
      expect(result.settleAmount).toBe(0);
    });

    it('margin = fee - channelCost represents gross profit', () => {
      const calc = createCalculator({
        FEE_RATE_PAYPAL: '0.05', // charge merchant 5%
        CHANNEL_COST_PAYPAL: '0.03', // upstream costs 3%
      });
      const result = calc.calculate('paypal', 10000);

      expect(result.fee).toBe(500);
      expect(result.channelCost).toBe(300);
      expect(result.fee - result.channelCost).toBe(200); // 2% gross margin
    });
  });
});
