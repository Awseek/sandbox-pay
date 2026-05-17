import { Injectable } from '@nestjs/common';

/**
 * In-memory nonce de-duplication store for replay-attack prevention.
 *
 * Single-process only. For multi-instance deployments, replace with Redis SETNX + TTL.
 * Keys are auto-evicted past their TTL via lazy cleanup on each `tryConsume` call,
 * with a hard cap to prevent memory blow-up under attack.
 */
@Injectable()
export class NonceStore {
  private readonly store = new Map<string, number>();
  private readonly maxEntries = 100_000;

  /**
   * Returns true if the nonce is fresh (and stored), false if a duplicate was seen.
   */
  tryConsume(key: string, ttlMs: number): boolean {
    const now = Date.now();
    this.evictExpired(now);

    if (this.store.has(key)) {
      const expiresAt = this.store.get(key)!;
      if (expiresAt > now) return false;
    }

    if (this.store.size >= this.maxEntries) {
      // Hard cap reached — drop the oldest by re-creating map. Acceptable trade-off
      // because expired entries should normally keep size bounded.
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, now + ttlMs);
    return true;
  }

  private evictExpired(now: number) {
    // Lazy sampling: scan a small batch each call to amortise cost.
    let scanned = 0;
    for (const [k, exp] of this.store) {
      if (exp <= now) this.store.delete(k);
      if (++scanned >= 64) break;
    }
  }
}
