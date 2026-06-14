import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/shared/infrastructure/password-hasher';

describe('PasswordHasher', () => {
  const plainPassword = 'MiPasswordSegura123!';

  it('should return a hash different from the original password', async () => {
    const hash = await hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plainPassword);
  });

  it('should produce different hashes for the same password (due to salt)', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).not.toBe(hash2);
  });

  it('should verify a correct password against its hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, hash);

    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword('WrongPassword123!', hash);

    expect(isValid).toBe(false);
  });

  it('should reject empty password against a hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword('', hash);

    expect(isValid).toBe(false);
  });
});
