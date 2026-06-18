import type { RateLimitResult } from './entities/rate-limit-result';

export type { RateLimitResult };

/**
 * RateLimiter — the port for login attempt rate limiting.
 *
 * Architecture:
 *   App route (auth)  →  container.getRateLimiter()  (this port)
 *   Concrete adapter  →  Prisma-backed implementation (production)
 *   Test double       →  MemoryRateLimiter          (unit tests)
 *
 * Lives in the auth module's domain layer — auth is the only module
 * that needs it, so module ownership beats a generic kernel port.
 *
 * Thresholds are part of the contract:
 *   - 5 failed attempts per email in 15 min → block email for 15 min
 *   - 20 failed attempts per IP in 15 min   → block IP for 1 hour
 *
 * These come from docs/security-gaps.md §1 and are intentionally
 * enforced inside the implementation, not by the caller.
 */
export interface RateLimiter {
  /**
   * Check whether the given (email, ip) pair is currently rate-limited.
   * Returns a `blocked: true` result with the reason and a retry hint.
   * Email-based blocking takes precedence over IP-based blocking.
   */
  checkRateLimit(email: string, ip: string): Promise<RateLimitResult>;

  /**
   * Persist a login attempt for later inspection by `checkRateLimit`.
   * Successful and failed attempts are both recorded so that, in the
   * future, analytics / audit features can inspect history.
   */
  recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void>;
}
