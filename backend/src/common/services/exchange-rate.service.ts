import { Injectable } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
  async getCnyToUsdRateAsync(): Promise<number> {
    // In a real app, this would call an API or use a cached rate
    return 0.14; // 1 CNY = 0.14 USD approx
  }
}
