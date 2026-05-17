import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { errMessage } from '../util/error';

interface CachedRate {
  value: number;
  expiresAt: number;
}

/**
 * Fetches live CNY→USD exchange rate from a public provider and caches it in
 * memory. Falls back to a configurable static rate if all upstream calls fail.
 *
 * Provider precedence (env `EXCHANGE_RATE_PROVIDER`):
 *   - `open-er-api` (default): https://open.er-api.com/v6/latest/CNY  (no key needed)
 *   - `static`: always use FALLBACK_CNY_TO_USD
 *
 * For production: consider switching to a paid provider (Fixer / Open Exchange Rates)
 * or implementing a margin spread (e.g. multiply by 0.98) to absorb FX swing.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly cache = new Map<string, CachedRate>();
  private readonly cacheTtlMs: number;
  private readonly fallback: number;
  private readonly margin: number;
  private readonly provider: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtlMs = Number(this.configService.get('EXCHANGE_RATE_CACHE_TTL_MS', 60 * 60 * 1000));
    this.fallback = Number(this.configService.get('FALLBACK_CNY_TO_USD', 0.14));
    this.margin = Number(this.configService.get('EXCHANGE_RATE_MARGIN', 1));
    this.provider = this.configService.get<string>('EXCHANGE_RATE_PROVIDER', 'open-er-api')!;
  }

  async getCnyToUsdRateAsync(): Promise<number> {
    return this.getRate('CNY', 'USD');
  }

  async getRate(from: string, to: string): Promise<number> {
    const key = `${from}->${to}`;
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.value;

    let rate: number | null = null;
    if (this.provider === 'open-er-api') rate = await this.fetchOpenErApi(from, to);

    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      this.logger.warn(`Exchange rate fetch failed for ${key}, using fallback ${this.fallback}`);
      rate = this.fallback;
    }

    const effective = rate * this.margin;
    this.cache.set(key, { value: effective, expiresAt: now + this.cacheTtlMs });
    return effective;
  }

  private async fetchOpenErApi(from: string, to: string): Promise<number | null> {
    try {
      const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
      const res = await firstValueFrom(this.httpService.get(url, { timeout: 5000 }));
      const rate = res?.data?.rates?.[to];
      return typeof rate === 'number' ? rate : null;
    } catch (err: unknown) {
      this.logger.warn(`open.er-api fetch error: ${errMessage(err)}`);
      return null;
    }
  }
}
