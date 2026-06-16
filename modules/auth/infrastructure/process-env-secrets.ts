import type { SecretsPort } from '@/modules/auth/domain/secrets';

/**
 * Process-env adapter for the SecretsPort domain port.
 *
 * Validates secrets at call time — never at import time. This prevents
 * silent security holes like signing tokens with the string "undefined".
 */
export class ProcessEnvSecrets implements SecretsPort {
  getAuthSecret(): Uint8Array {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error(
        '[Auth] NEXTAUTH_SECRET environment variable is required but not set.',
      );
    }
    return new TextEncoder().encode(secret);
  }
}
