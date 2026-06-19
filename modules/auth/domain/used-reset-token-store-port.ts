/**
 * UsedResetTokenStorePort — the port for tracking already-used reset tokens.
 *
 * Provides replay protection: once a token is consumed, any subsequent
 * attempt to reuse it MUST be rejected.
 *
 * Architecture:
 *   ResetPasswordUseCase  ── depends on  →  this port (DI)
 *   Memory implementation  ── implements  →  in-memory Set (single process)
 *   Redis adapter          ── implements  →  production (multi-instance safe)
 *
 * Both implementations are interchangeable — consumers only depend
 * on this interface.
 */
export interface UsedResetTokenStorePort {
  /**
   * Check whether a token has already been used.
   * Returns true if the token was already consumed.
   */
  isTokenUsed(jti: string): boolean;

  /**
   * Mark a token as used so it cannot be reused.
   * @param jti — unique token identifier (JWT ID)
   * @param exp — optional expiry in milliseconds for auto-cleanup
   */
  markTokenUsed(jti: string, exp?: number): void;
}
