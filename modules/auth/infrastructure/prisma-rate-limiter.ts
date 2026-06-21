import { prisma } from '@/shared/infrastructure/prisma';
import type {
  RateLimitResult,
  RateLimiter,
} from '@/modules/auth/domain/rate-limiter';

/**
 * Prisma-backed implementation of the RateLimiter port.
 *
 * Persists every login attempt in the `loginAttempt` table and counts
 * recent failures against fixed thresholds. Thresholds and windows
 * mirror docs/security-gaps.md §1:
 *   - 5 failed email attempts in 15 min → block email for 15 min
 *   - 20 failed IP attempts in 15 min   → block IP for 1 hour
 *
 * The domain never knows about Prisma — this adapter is wired to the
 * `RateLimiter` port through the composition root (container).
 */
const FIFTEEN_MIN = 15 * 60 * 1000;
const EMAIL_FAIL_THRESHOLD = 5;
const IP_FAIL_THRESHOLD = 20;
const EMAIL_BLOCK_SECONDS = 15 * 60;
const IP_BLOCK_SECONDS = 60 * 60;

export class PrismaRateLimiter implements RateLimiter {
  async checkRateLimit(email: string, ip: string): Promise<RateLimitResult> {
    const since = new Date(Date.now() - FIFTEEN_MIN);

    // 5 failed attempts per email in 15 min
    const emailFails = await prisma.loginAttempt.count({
      where: { email, success: false, createdAt: { gte: since } },
    });
    if (emailFails >= EMAIL_FAIL_THRESHOLD) {
      return {
        blocked: true,
        reason: 'email',
        retryAfterSeconds: EMAIL_BLOCK_SECONDS,
      };
    }

    // 20 failed attempts per IP in 15 min
    const ipFails = await prisma.loginAttempt.count({
      where: { ipAddress: ip, success: false, createdAt: { gte: since } },
    });
    if (ipFails >= IP_FAIL_THRESHOLD) {
      return {
        blocked: true,
        reason: 'ip',
        retryAfterSeconds: IP_BLOCK_SECONDS,
      };
    }

    return { blocked: false };
  }

  async recordLoginAttempt(
    email: string,
    ip: string,
    success: boolean,
  ): Promise<void> {
    await prisma.loginAttempt.create({
      data: { email, ipAddress: ip, success },
    });
  }
}
