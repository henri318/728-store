import type { SecretsPort } from '@/modules/auth/domain/secrets';

/**
 * In-memory SecretsPort test double.
 *
 * Tests can set the secret via `setAuthSecret()` to simulate different
 * environments without touching process.env.
 */
export class MemorySecrets implements SecretsPort {
  private secret: string = 'test-secret-for-unit-tests';

  getAuthSecret(): Uint8Array {
    if (!this.secret) {
      throw new Error(
        '[Auth] NEXTAUTH_SECRET environment variable is required but not set.',
      );
    }
    return new TextEncoder().encode(this.secret);
  }

  /** Test helper — set the secret value. */
  setAuthSecret(value: string): void {
    this.secret = value;
  }

  /** Test helper — simulate missing secret. */
  clearAuthSecret(): void {
    this.secret = '';
  }
}
