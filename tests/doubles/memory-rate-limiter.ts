import type {
  RateLimitResult,
  RateLimiter,
} from '@/modules/auth/domain/rate-limiter';

/**
 * In-memory RateLimiter test double.
 *
 * Stores login attempts in plain arrays. Test cases can:
 *   - call checkRateLimit / recordLoginAttempt as the production code would
 *   - inspect `attempts` to assert what was persisted
 *
 * Enforces the SAME thresholds as the production Prisma adapter so unit
 * tests exercise the same boundary conditions:
 *   - 5 failed email attempts in 15 min → block email
 *   - 20 failed IP attempts in 15 min   → block IP
 *
 * This is the ONLY place in the test suite that should construct one of
 * these — production wires the Prisma adapter.
 */
export class MemoryRateLimiter implements RateLimiter {
  /** Thresholds — keep in sync with the Prisma adapter and docs/security-gaps.md. */
  public readonly EMAIL_FAIL_THRESHOLD = 5;
  public readonly IP_FAIL_THRESHOLD = 20;
  public readonly WINDOW_MS = 15 * 60 * 1000;
  public readonly EMAIL_BLOCK_SECONDS = 15 * 60;
  public readonly IP_BLOCK_SECONDS = 60 * 60;

  private store: Array<{
    email: string;
    ip: string;
    success: boolean;
    createdAt: Date;
  }> = [];

  async checkRateLimit(email: string, ip: string): Promise<RateLimitResult> {
    const since = new Date(Date.now() - this.WINDOW_MS);

    const emailFails = this.store.filter(
      (a) =>
        a.email === email &&
        a.success === false &&
        a.createdAt.getTime() >= since.getTime(),
    ).length;
    if (emailFails >= this.EMAIL_FAIL_THRESHOLD) {
      return {
        blocked: true,
        reason: 'email',
        retryAfterSeconds: this.EMAIL_BLOCK_SECONDS,
      };
    }

    const ipFails = this.store.filter(
      (a) =>
        a.ip === ip &&
        a.success === false &&
        a.createdAt.getTime() >= since.getTime(),
    ).length;
    if (ipFails >= this.IP_FAIL_THRESHOLD) {
      return {
        blocked: true,
        reason: 'ip',
        retryAfterSeconds: this.IP_BLOCK_SECONDS,
      };
    }

    return { blocked: false };
  }

  async recordLoginAttempt(
    email: string,
    ip: string,
    success: boolean,
  ): Promise<void> {
    this.store.push({ email, ip, success, createdAt: new Date() });
  }

  /** Test helper — return the full list of stored attempts. */
  allAttempts(): ReadonlyArray<{
    email: string;
    ip: string;
    success: boolean;
    createdAt: Date;
  }> {
    return [...this.store];
  }
}
