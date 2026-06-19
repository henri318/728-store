import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import type { ResetTokenCodec, ResetTokenPayload } from '@/modules/auth/domain/reset-token-codec-port';

/**
 * JwtResetTokenCodec — production adapter using HS256 JWT via jose.
 *
 * Signs tokens with the provided secret (Uint8Array). The secret is
 * injected via the container from SecretsPort.getAuthSecret().
 *
 * JWT exp is in seconds (RFC 7519), but the ResetTokenPayload interface
 * uses milliseconds. This adapter converts internally.
 */
export class JwtResetTokenCodec implements ResetTokenCodec {
  constructor(private readonly secret: Uint8Array) {}

  async encode(payload: ResetTokenPayload): Promise<string> {
    return new SignJWT({ email: payload.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(randomUUID())
      .setExpirationTime(Math.floor(payload.exp / 1000))
      .sign(this.secret);
  }

  async decode(token: string): Promise<ResetTokenPayload> {
    // jwtVerify automatically validates exp, iat, nbf claims
    const { payload } = await jwtVerify(token, this.secret);

    if (typeof payload.email !== 'string' || payload.email.trim() === '') {
      throw new Error('Invalid reset token: missing or malformed email claim');
    }

    return {
      email: payload.email,
      // Convert JWT seconds back to milliseconds for interface consistency
      exp: (payload.exp as number) * 1000,
      jti: payload.jti as string | undefined,
    };
  }
}
