import type { UsedResetTokenStorePort } from '@/modules/auth/domain/used-reset-token-store-port';

/**
 * MemoryUsedResetTokenStore — in-memory adapter tracking already-used reset tokens.
 *
 * Simple Map<jti, expiry> keyed by jti (JWT ID). Tokens are removed after
 * their expiry (lazy cleanup on check/mark).
 *
 * @limitation Process-local storage — tokens are NOT shared across instances.
 *   In a multi-instance deployment (serverless, load-balanced containers),
 *   a token consumed on instance A could be reused on instance B.
 *   For production multi-instance deployments, replace with a Redis adapter
 *   that provides atomic read-check-write operations.
 *
 * TODO: Replace with Redis adapter for production multi-instance deployments.
 */
export class MemoryUsedResetTokenStore implements UsedResetTokenStorePort {
  private readonly usedTokens = new Map<string, number>(); // jti → expiry timestamp (ms)

  /** Clean up expired entries (called on each mark/check). */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [jti, exp] of this.usedTokens) {
      if (now > exp) this.usedTokens.delete(jti);
    }
  }

  /** Check if a token has already been used. */
  isTokenUsed(jti: string): boolean {
    this.purgeExpired();
    return this.usedTokens.has(jti);
  }

  /** Mark a token as used with optional expiry for auto-cleanup. */
  markTokenUsed(jti: string, exp?: number): void {
    this.purgeExpired();
    this.usedTokens.set(jti, exp ?? Date.now() + 3600_000); // default 1h TTL
  }
}
