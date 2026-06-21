import type {
  ResetTokenCodec,
  ResetTokenPayload,
} from '@/modules/auth/domain/reset-token-codec-port';

/**
 * Base64ResetTokenCodec — jsdom-safe adapter for tests.
 *
 * Encodes tokens as base64url(JSON({email, exp, jti})) — no cryptography,
 * no external dependencies. Safe to use in jsdom (no Web Crypto API needed).
 *
 * Throws on expired or malformed tokens (consistent with JWT codec behaviour).
 */
export class Base64ResetTokenCodec implements ResetTokenCodec {
  encode(payload: ResetTokenPayload): string {
    const json = JSON.stringify({
      email: payload.email,
      exp: payload.exp,
      jti: crypto.randomUUID(),
    });
    return Buffer.from(json, 'utf-8').toString('base64url');
  }

  decode(token: string): ResetTokenPayload {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const payload = JSON.parse(json);

    // Validate shape
    if (!payload.email || typeof payload.exp !== 'number') {
      throw new Error('Invalid reset token: missing email or exp');
    }

    // Check expiry (exp is in milliseconds)
    if (Date.now() > payload.exp) {
      throw new Error('Reset token has expired');
    }

    return {
      email: payload.email,
      exp: payload.exp,
      jti: payload.jti,
    };
  }
}
