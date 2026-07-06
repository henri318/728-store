import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaRateLimiter } from '@/modules/auth/infrastructure/prisma-rate-limiter';
import { prisma } from '@/shared/infrastructure/prisma';

const TEST_IP_A = '192.168.1.1';
const TEST_IP_B = '10.0.0.1';
const TEST_IP_C = '172.16.0.1';
const TEST_IP_D = '172.16.0.2';
const TEST_IP_E = '10.99.99.99';
const TEST_IP_F = '192.168.100.1';

/**
 * PrismaRateLimiter — Integration tests against real Docker PostgreSQL.
 *
 * Verifies login attempt recording and rate-limit threshold checks
 * through the actual Prisma adapter (no mocks).
 *
 * Business rules (from docs/security-gaps.md):
 *   - 5 failed email attempts in 15 min → block email for 15 min
 *   - 20 failed IP attempts in 15 min   → block IP for 1 hour
 *
 * NOTE: the contract scenarios (thresholds, blocking priority) are also
 * tested via MemoryRateLimiter in the unit test suite. This integration
 * test validates that Prisma correctly persists and queries the data.
 */
describe('PrismaRateLimiter — Integration', () => {
  let rateLimiter: PrismaRateLimiter;

  beforeAll(async () => {
    await cleanupDb();
    rateLimiter = new PrismaRateLimiter();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  describe('recordLoginAttempt', () => {
    it('should persist a login attempt', async () => {
      await rateLimiter.recordLoginAttempt('user@test.com', TEST_IP_A, false);

      const count = await prisma.loginAttempt.count({
        where: { email: 'user@test.com' },
      });
      expect(count).toBe(1);
    });

    it('should record success and failure separately', async () => {
      await rateLimiter.recordLoginAttempt('success@test.com', TEST_IP_B, true);
      await rateLimiter.recordLoginAttempt(
        'success@test.com',
        TEST_IP_B,
        false,
      );

      const attempts = await prisma.loginAttempt.findMany({
        where: { email: 'success@test.com' },
        orderBy: { createdAt: 'asc' },
      });
      expect(attempts).toHaveLength(2);
      expect(attempts[0].success).toBe(true);
      expect(attempts[1].success).toBe(false);
    });
  });

  describe('checkRateLimit — email threshold', () => {
    it('should not block when fewer than 5 failed attempts', async () => {
      const email = 'partial@test.com';
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordLoginAttempt(email, TEST_IP_C, false);
      }

      const result = await rateLimiter.checkRateLimit(email, TEST_IP_C);
      expect(result.blocked).toBe(false);
    });

    it('should block email after exactly 5 failed attempts', async () => {
      const email = 'blocked-email@test.com';
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordLoginAttempt(email, TEST_IP_D, false);
      }

      const result = await rateLimiter.checkRateLimit(email, TEST_IP_D);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('email');
      expect(result.retryAfterSeconds).toBe(15 * 60);
    });
  });

  describe('checkRateLimit — IP threshold', () => {
    it('should block IP after 20 failed attempts across different emails', async () => {
      for (let i = 0; i < 20; i++) {
        await rateLimiter.recordLoginAttempt(
          `spam-${i}@test.com`,
          TEST_IP_E,
          false,
        );
      }

      const result = await rateLimiter.checkRateLimit(
        'any@test.com',
        TEST_IP_E,
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('ip');
      expect(result.retryAfterSeconds).toBe(60 * 60);
    });
  });

  describe('checkRateLimit — clean slate', () => {
    it('should not block when no failed attempts exist', async () => {
      const result = await rateLimiter.checkRateLimit(
        'clean@test.com',
        TEST_IP_F,
      );
      expect(result.blocked).toBe(false);
    });
  });
});
