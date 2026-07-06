import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRateLimiter } from '@/tests/doubles/memory-rate-limiter';

/**
 * Tests for the RateLimiter port contract, exercised via the in-memory
 * test double. The Prisma adapter uses the same thresholds, so the same
 * boundary cases apply in production.
 *
 * Thresholds (from docs/security-gaps.md §1):
 *   - 5 failed email attempts in 15 min → block email for 15 min
 *   - 20 failed IP attempts in 15 min   → block IP for 1 hour
 */
const TEST_IP = '1.1.1.1';
const OTHER_IP = '2.2.2.2';
const BLOCKED_IP = '3.3.3.3';

describe('RateLimiter — port contract (via MemoryRateLimiter)', () => {
  let rateLimiter: MemoryRateLimiter;

  beforeEach(() => {
    rateLimiter = new MemoryRateLimiter();
  });

  describe('checkRateLimit', () => {
    it('should not block when there are no prior attempts', async () => {
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should not block when there are fewer than 5 failed email attempts', async () => {
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(false);
    });

    it('should block the email after exactly 5 failed email attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
      expect(result.retryAfterSeconds).toBe(900);
    });

    it('should not count successful attempts toward the email threshold', async () => {
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          TEST_IP,
          false,
        );
      }
      await rateLimiter.recordLoginAttempt('user@example.com', TEST_IP, true);
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(false);
    });

    it('should not block by email when failures are split across many emails from the same IP', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'new@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(false);
    });

    it('should block the IP after exactly 20 failed IP attempts (across any email)', async () => {
      for (let i = 0; i < 20; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'fresh@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('ip');
      expect(result.retryAfterSeconds).toBe(3600);
    });

    it('should not count successful IP attempts toward the IP threshold', async () => {
      for (let i = 0; i < 19; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          TEST_IP,
          false,
        );
      }
      await rateLimiter.recordLoginAttempt('user19@example.com', TEST_IP, true);
      const result = await rateLimiter.checkRateLimit(
        'fresh@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(false);
    });

    it('should prefer email blocking over IP blocking when both apply', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          'user0@example.com',
          TEST_IP,
          false,
        );
      }
      for (let i = 0; i < 15; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i + 1}@example.com`,
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user0@example.com',
        TEST_IP,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
    });

    it('should not block attempts outside the 15-minute window', async () => {
      vi.useFakeTimers();
      try {
        const base = new Date('2026-06-15T12:00:00Z');
        vi.setSystemTime(base);

        for (let i = 0; i < 5; i++) {
          await rateLimiter.recordLoginAttempt(
            'user@example.com',
            TEST_IP,
            false,
          );
        }
        vi.setSystemTime(new Date(base.getTime() + 20 * 60 * 1000));

        const result = await rateLimiter.checkRateLimit(
          'user@example.com',
          TEST_IP,
        );
        expect(result.blocked).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not let a different IP share rate-limit state', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          TEST_IP,
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        OTHER_IP,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
    });
  });

  describe('recordLoginAttempt', () => {
    it('should persist the attempt so a subsequent check sees it', async () => {
      await rateLimiter.recordLoginAttempt('user@example.com', TEST_IP, false);

      const all = rateLimiter.allAttempts();
      expect(all).toHaveLength(1);
      expect(all[0].email).toBe('user@example.com');
      expect(all[0].ip).toBe(TEST_IP);
      expect(all[0].success).toBe(false);
      expect(all[0].createdAt).toBeInstanceOf(Date);
    });

    it('should persist successful attempts as well', async () => {
      await rateLimiter.recordLoginAttempt('user@example.com', TEST_IP, true);

      const all = rateLimiter.allAttempts();
      expect(all).toHaveLength(1);
      expect(all[0].success).toBe(true);
    });

    it('should accumulate multiple attempts in order', async () => {
      await rateLimiter.recordLoginAttempt('a@example.com', TEST_IP, false);
      await rateLimiter.recordLoginAttempt('b@example.com', OTHER_IP, true);
      await rateLimiter.recordLoginAttempt('c@example.com', BLOCKED_IP, false);

      const all = rateLimiter.allAttempts();
      expect(all).toHaveLength(3);
      expect(all.map((a) => a.email)).toEqual([
        'a@example.com',
        'b@example.com',
        'c@example.com',
      ]);
    });
  });
});
