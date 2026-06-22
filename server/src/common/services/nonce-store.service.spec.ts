import { NonceStore } from './nonce-store.service';

describe('NonceStore', () => {
  let store: NonceStore;

  beforeEach(() => {
    store = new NonceStore();
  });

  describe('tryConsume', () => {
    it('returns true for a fresh nonce', () => {
      expect(store.tryConsume('nonce-1', 60_000)).toBe(true);
    });

    it('returns false for a duplicate nonce within TTL', () => {
      store.tryConsume('nonce-2', 60_000);
      expect(store.tryConsume('nonce-2', 60_000)).toBe(false);
    });

    it('allows a nonce to be reused after TTL expires', () => {
      // Use a very short TTL
      store.tryConsume('nonce-3', 1); // 1ms TTL

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {} // busy-wait 5ms

      expect(store.tryConsume('nonce-3', 60_000)).toBe(true);
    });

    it('tracks different nonces independently', () => {
      store.tryConsume('a', 60_000);
      store.tryConsume('b', 60_000);

      expect(store.tryConsume('a', 60_000)).toBe(false);
      expect(store.tryConsume('b', 60_000)).toBe(false);
      expect(store.tryConsume('c', 60_000)).toBe(true);
    });
  });

  describe('eviction', () => {
    it('evicts expired entries lazily', () => {
      store.tryConsume('old', 1); // 1ms TTL
      const start = Date.now();
      while (Date.now() - start < 5) {} // wait for expiry

      // This call triggers eviction of 'old'
      store.tryConsume('new', 60_000);

      // 'old' should have been evicted, so we can consume it again
      expect(store.tryConsume('old', 60_000)).toBe(true);
    });
  });
});
