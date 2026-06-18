import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserLookup } from './memory-user-lookup';

/**
 * Tests for the UserLookupPort test double.
 *
 * Uses the NEW role values (ADMIN, SUPPORT, DESIGNER, CUSTOMER) from the
 * roles module, matching the updated UserLookupPort contract.
 */
describe('MemoryUserLookup', () => {
  let lookup: MemoryUserLookup;

  beforeEach(() => {
    lookup = new MemoryUserLookup();
  });

  describe('findById', () => {
    it('should return {id, role} for a known user', async () => {
      lookup.seed({ id: 'u1', role: 'ADMIN' });

      const result = await lookup.findById('u1');

      expect(result).toEqual({ id: 'u1', role: 'ADMIN' });
    });

    it('should return null for an unknown id', async () => {
      lookup.seed({ id: 'u1', role: 'CUSTOMER' });

      const result = await lookup.findById('nope');
      expect(result).toBeNull();
    });

    it('should accept all new role values', async () => {
      lookup.seed({ id: 'u1', role: 'ADMIN' });
      lookup.seed({ id: 'u2', role: 'SUPPORT' });
      lookup.seed({ id: 'u3', role: 'DESIGNER' });
      lookup.seed({ id: 'u4', role: 'CUSTOMER' });

      expect((await lookup.findById('u1'))!.role).toBe('ADMIN');
      expect((await lookup.findById('u2'))!.role).toBe('SUPPORT');
      expect((await lookup.findById('u3'))!.role).toBe('DESIGNER');
      expect((await lookup.findById('u4'))!.role).toBe('CUSTOMER');
    });
  });
});
