import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { MemoryUsedResetTokenStore } from '@/modules/auth/infrastructure/memory-used-reset-token-store';
import { Base64ResetTokenCodec } from '@/modules/auth/infrastructure/base64-reset-token-codec';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/**
 * Task F7 — ResetPasswordUseCase tests
 *
 * Spec scenarios:
 * - GIVEN valid token WHEN reset THEN password updated, token marked as used, event emitted
 * - GIVEN already-used token (replay) WHEN reset THEN ConflictError ("already been used")
 * - GIVEN expired token WHEN reset THEN UnauthorizedError
 * - GIVEN deleted user WHEN reset THEN UnauthorizedError ("Account is deactivated")
 */

describe('ResetPasswordUseCase', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;
  let tokenCodec: Base64ResetTokenCodec;
  let usedTokenStore: MemoryUsedResetTokenStore;

  const userEmail = 'reset@example.com';
  const newPassword = 'newSecurePassword999';

  beforeEach(async () => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();
    tokenCodec = new Base64ResetTokenCodec();
    usedTokenStore = new MemoryUsedResetTokenStore();

    // Seed an active user
    await userRepository.save({
      userId: UserId.create('user-rp-1'),
      email: Email.create(userEmail),
      firstName: 'Reset',
      lastName: 'Test',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('mem:oldPassword'),
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  async function createUseCase() {
    const { ResetPasswordUseCase } =
      await import('@/modules/users/application/use-cases/reset-password-use-case');
    return new ResetPasswordUseCase(
      userRepository,
      passwordHasher,
      tokenCodec,
      outboxRepository,
      usedTokenStore,
    );
  }

  async function createValidToken(
    email = userEmail,
    ttlMs = 3600_000,
  ): Promise<string> {
    return tokenCodec.encode({
      email,
      exp: Date.now() + ttlMs,
    });
  }

  // ── Happy Path: valid reset ──────────────────────────────────

  it('should reset password when token is valid', async () => {
    const token = await createValidToken();
    const useCase = await createUseCase();

    const result = await useCase.execute({ token, newPassword });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Password has been reset successfully');

    // User password should have been updated
    const user = await userRepository.findById('user-rp-1');
    expect(user).not.toBeNull();
    expect(user!.passwordHash.value).toBe(`mem:${newPassword}`);

    // Token should be marked as used
    // The original token's jti should now be marked used
    // (verify replay rejection below tests this separately)
  });

  it('should emit PASSWORD_RESET domain event on successful reset', async () => {
    const token = await createValidToken();
    const useCase = await createUseCase();

    await useCase.execute({ token, newPassword });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      GlobalEvents.PASSWORD_RESET,
    );
    expect(outboxRepository.events[0].payload.userId).toBe('user-rp-1');
  });

  // ── Replay rejection ─────────────────────────────────────────

  it('should reject replay of an already-used token', async () => {
    const token = await createValidToken();
    const useCase = await createUseCase();

    // First use — succeeds
    const result1 = await useCase.execute({ token, newPassword });
    expect(result1.success).toBe(true);

    // Second use — must fail (replay)
    await expect(useCase.execute({ token, newPassword })).rejects.toThrow(
      'already been used',
    );
  });

  // ── Expired token ────────────────────────────────────────────

  it('should reject an expired token', async () => {
    // Create a token that expired 1 second ago
    const token = await createValidToken(userEmail, -1000);
    const useCase = await createUseCase();

    await expect(useCase.execute({ token, newPassword })).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  // ── Deleted user ─────────────────────────────────────────────

  it('should reject password reset for a deleted (deactivated) user', async () => {
    // Soft-delete the user
    const user = await userRepository.findById('user-rp-1');
    await userRepository.update({
      ...user!,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await createValidToken();
    const useCase = await createUseCase();

    await expect(useCase.execute({ token, newPassword })).rejects.toThrow(
      'Account is deactivated',
    );
  });

  // ── User not found (email in token doesn't match any user) ──

  it('should reject when user does not exist (email from token not found)', async () => {
    const token = await createValidToken('nonexistent@example.com');
    const useCase = await createUseCase();

    await expect(useCase.execute({ token, newPassword })).rejects.toThrow(
      'User not found',
    );
  });
});
