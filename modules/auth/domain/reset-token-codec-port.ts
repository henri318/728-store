/**
 * ResetTokenCodec — the port for encoding/decoding password-reset tokens.
 *
 * Architecture:
 *   ForgotPasswordUseCase  ── uses →  encode(payload) → token string
 *   ResetPasswordRoute     ── uses →  decode(token)   → payload
 *
 *   Tests                  ── bind  →  Base64ResetTokenCodec  (jsdom-safe, no crypto)
 *   Production             ── bind  →  JwtResetTokenCodec     (standard JWT via jose)
 *
 * Both implementations MUST be interchangeable — consumers only depend
 * on this interface, never on the concrete adapter.
 */
export interface ResetTokenPayload {
  /** User's email address */
  email: string;
  /** Expiration timestamp in milliseconds (Date.now() + TTL) */
  exp: number;
}

export interface ResetTokenCodec {
  /**
   * Encode a payload into an opaque token string.
   * The returned string is safe for use in URLs (no padding or special chars).
   */
  encode(payload: ResetTokenPayload): string | Promise<string>;

  /**
   * Decode a token string back into a payload.
   * MUST throw (not return null) if the token is expired, malformed,
   * or otherwise invalid. The caller wraps in try/catch.
   */
  decode(token: string): ResetTokenPayload | Promise<ResetTokenPayload>;
}
