/**
 * UsedResetTokenStore — in-memory store tracking already-used reset tokens.
 *
 * Simple Set<string> keyed by jti (JWT ID). Tokens are removed after
 * their expiry (lazy cleanup on check).
 *
 * In production, replace with a Redis-backed store for multi-process safety.
 * For now this provides replay protection within a single Node.js process.
 */

const usedTokens = new Map<string, number>(); // jti → expiry timestamp (ms)

/** Clean up expired entries (called on each mark/check). */
function purgeExpired(): void {
  const now = Date.now();
  for (const [jti, exp] of usedTokens) {
    if (now > exp) usedTokens.delete(jti);
  }
}

/**
 * Check if a token has already been used.
 * Returns true if the token was already consumed.
 */
export function isTokenUsed(jti: string): boolean {
  purgeExpired();
  return usedTokens.has(jti);
}

/**
 * Mark a token as used. Optionally provide expiry (ms) for auto-cleanup.
 */
export function markTokenUsed(jti: string, exp?: number): void {
  purgeExpired();
  usedTokens.set(jti, exp ?? Date.now() + 3600_000); // default 1h TTL
}
