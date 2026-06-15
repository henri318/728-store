/**
 * PasswordHasher — the port for hashing and verifying passwords.
 *
 * Lives in the users module because only the users use cases (registration,
 * login verification) need to hash passwords. Module ownership beats a
 * generic kernel port.
 *
 * Production implementation: bcrypt (in `../infrastructure/bcrypt-password-hasher.ts`).
 * Test implementation:      MemoryPasswordHasher (in tests/doubles).
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, hash: string): Promise<boolean>;
}
