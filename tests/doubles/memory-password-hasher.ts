import type { PasswordHasher } from '@/modules/users/domain/password-hasher';

/**
 * In-memory PasswordHasher test double.
 *
 * The hash is just a prefixed string (`mem:<plain>`), and `verify` checks
 * that the candidate matches the stored plain. This is intentionally
 * trivial — its only job is to satisfy the port in unit tests where the
 * actual hashing algorithm is irrelevant.
 *
 * Tests that DO care about the real bcrypt behaviour must inject a real
 * `PasswordHasher` (or use the production wiring through the container).
 */
export class MemoryPasswordHasher implements PasswordHasher {
  private readonly prefix = 'mem:';

  async hash(plainPassword: string): Promise<string> {
    return `${this.prefix}${plainPassword}`;
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return hash === `${this.prefix}${plainPassword}`;
  }
}
