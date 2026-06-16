import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserLookup } from './memory-user-lookup';

/**
 * Tests for the UserLookupPort kernel port.
 *
 * The port lives in `shared/kernel/user-lookup.ts` (pure, no Prisma).
 * The Memory double lives in `tests/doubles/memory-user-lookup.ts` and is
 * the only place that should construct one of these — production wires
 * the Prisma adapter.
 */
describe('MemoryUserLookup', () => {
  let lookup: MemoryUserLookup;

  beforeEach(() => {
    lookup = new MemoryUserLookup();
  });

  describe('findById', () => {
    it('should return {id, role} for a known user', async () => {
      lookup.seed({ id: 'u1', role: 'admin' });

      const result = await lookup.findById('u1');

      expect(result).toEqual({ id: 'u1', role: 'admin' });
    });

    it('should return null for an unknown id', async () => {
      lookup.seed({ id: 'u1', role: 'client' });

      const result = await lookup.findById('nope');
      expect(result).toBeNull();
    });

    it('should accept all role values from the kernel port', async () => {
      lookup.seed({ id: 'u1', role: 'admin' });
      lookup.seed({ id: 'u2', role: 'client' });
      lookup.seed({ id: 'u3', role: 'shop' });
      lookup.seed({ id: 'u4', role: 'guest' });

      expect((await lookup.findById('u1'))!.role).toBe('admin');
      expect((await lookup.findById('u2'))!.role).toBe('client');
      expect((await lookup.findById('u3'))!.role).toBe('shop');
      expect((await lookup.findById('u4'))!.role).toBe('guest');
    });
  });
});
