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
describe('RateLimiter — port contract (via MemoryRateLimiter)', () => {
  let rateLimiter: MemoryRateLimiter;

  beforeEach(() => {
    rateLimiter = new MemoryRateLimiter();
  });

  describe('checkRateLimit', () => {
    it('should not block when there are no prior attempts', async () => {
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should not block when there are fewer than 5 failed email attempts', async () => {
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          '1.2.3.4',
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(false);
    });

    it('should block the email after exactly 5 failed email attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          '1.2.3.4',
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
      expect(result.retryAfterSeconds).toBe(900);
    });

    it('should not count successful attempts toward the email threshold', async () => {
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordLoginAttempt(
          'user@example.com',
          '1.2.3.4',
          false,
        );
      }
      // A successful attempt does not push us over the threshold
      await rateLimiter.recordLoginAttempt('user@example.com', '1.2.3.4', true);
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(false);
    });

    it('should not block by email when failures are split across many emails from the same IP', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          '1.2.3.4',
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'new@example.com',
        '1.2.3.4',
      );
      // Not blocked by email (this email has 0 fails) but blocked by IP
      // (we have 5 < 20, so still not blocked) — adjust below for the IP case
      expect(result.blocked).toBe(false);
    });

    it('should block the IP after exactly 20 failed IP attempts (across any email)', async () => {
      for (let i = 0; i < 20; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          '1.2.3.4',
          false,
        );
      }
      const result = await rateLimiter.checkRateLimit(
        'fresh@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('ip');
      expect(result.retryAfterSeconds).toBe(3600);
    });

    it('should not count successful IP attempts toward the IP threshold', async () => {
      for (let i = 0; i < 19; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i}@example.com`,
          '1.2.3.4',
          false,
        );
      }
      await rateLimiter.recordLoginAttempt(
        'user19@example.com',
        '1.2.3.4',
        true,
      );
      const result = await rateLimiter.checkRateLimit(
        'fresh@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(false);
    });

    it('should prefer email blocking over IP blocking when both apply', async () => {
      // First 5 failures: same email → triggers email threshold
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(
          'user0@example.com',
          '1.2.3.4',
          false,
        );
      }
      // Next 15 failures: different emails, same IP → brings IP total to 20
      for (let i = 0; i < 15; i++) {
        await rateLimiter.recordLoginAttempt(
          `user${i + 1}@example.com`,
          '1.2.3.4',
          false,
        );
      }
      // user0 has 5+ email fails AND the IP has 20+ fails — email should win
      const result = await rateLimiter.checkRateLimit(
        'user0@example.com',
        '1.2.3.4',
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
    });

    it('should not block attempts outside the 15-minute window', async () => {
      // Use vi.useFakeTimers to control Date.now() inside the limiter
      vi.useFakeTimers();
      try {
        const base = new Date('2026-06-15T12:00:00Z');
        vi.setSystemTime(base);

        // Record 5 failures 20 minutes ago — outside the 15-min window
        for (let i = 0; i < 5; i++) {
          await rateLimiter.recordLoginAttempt(
            'user@example.com',
            '1.2.3.4',
            false,
          );
        }
        vi.setSystemTime(new Date(base.getTime() + 20 * 60 * 1000));

        const result = await rateLimiter.checkRateLimit(
          'user@example.com',
          '1.2.3.4',
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
          '1.2.3.4',
          false,
        );
      }
      // Same email, different IP — should still be blocked by email
      const result = await rateLimiter.checkRateLimit(
        'user@example.com',
        '5.6.7.8',
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
    });
  });

  describe('recordLoginAttempt', () => {
    it('should persist the attempt so a subsequent check sees it', async () => {
      await rateLimiter.recordLoginAttempt(
        'user@example.com',
        '1.2.3.4',
        false,
      );

      const all = rateLimiter.allAttempts();
      expect(all).toHaveLength(1);
      expect(all[0].email).toBe('user@example.com');
      expect(all[0].ip).toBe('1.2.3.4');
      expect(all[0].success).toBe(false);
      expect(all[0].createdAt).toBeInstanceOf(Date);
    });

    it('should persist successful attempts as well', async () => {
      await rateLimiter.recordLoginAttempt('user@example.com', '1.2.3.4', true);

      const all = rateLimiter.allAttempts();
      expect(all).toHaveLength(1);
      expect(all[0].success).toBe(true);
    });

    it('should accumulate multiple attempts in order', async () => {
      await rateLimiter.recordLoginAttempt('a@example.com', '1.1.1.1', false);
      await rateLimiter.recordLoginAttempt('b@example.com', '2.2.2.2', true);
      await rateLimiter.recordLoginAttempt('c@example.com', '3.3.3.3', false);

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
