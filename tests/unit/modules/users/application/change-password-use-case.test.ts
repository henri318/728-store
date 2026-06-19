import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/**
 * Task 2.4 — ChangePasswordUseCase tests (RED phase)
 *
 * Spec scenarios:
 * - GIVEN valid current + new password WHEN execute THEN password updated, event emitted
 * - GIVEN wrong currentPassword WHEN execute THEN UnauthorizedError; password unchanged
 * - GIVEN user not found THEN NotFoundError
 */

// ChangePasswordUseCase does NOT exist yet — these tests will fail at import.
// The import error IS the RED signal.
describe('ChangePasswordUseCase', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;

  const originalPassword = 'oldPassword123';
  const newPassword = 'newSecret456';

  beforeEach(async () => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();

    // Seed a user with known password
    const hashedOriginal = await passwordHasher.hash(originalPassword);
    await userRepository.save({
      userId: UserId.create('user-cp-1'),
      email: Email.create('cp@example.com'),
      firstName: 'Change',
      lastName: 'Password',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create(hashedOriginal),
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should change password when current password is correct', async () => {
    const { ChangePasswordUseCase } = await import(
      '@/modules/users/application/use-cases/change-password-use-case'
    );

    const useCase = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      outboxRepository,
    );

    const result = await useCase.execute({
      userId: 'user-cp-1',
      currentPassword: originalPassword,
      newPassword,
    });

    expect(result.success).toBe(true);

    // Verify the user's password hash was updated in the repository
    const updatedUser = await userRepository.findById('user-cp-1');
    expect(updatedUser).not.toBeNull();
    expect(updatedUser!.passwordHash.value).not.toBe(`mem:${originalPassword}`);
    expect(updatedUser!.passwordHash.value).toBe(`mem:${newPassword}`);

    // Verify event was emitted
    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.PASSWORD_CHANGED);
    expect(outboxRepository.events[0].payload.userId).toBe('user-cp-1');
  });

  it('should throw UnauthorizedError when current password is wrong', async () => {
    const { ChangePasswordUseCase } = await import(
      '@/modules/users/application/use-cases/change-password-use-case'
    );

    const useCase = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'user-cp-1',
        currentPassword: 'wrongPassword',
        newPassword,
      }),
    ).rejects.toThrow('Current password is incorrect');

    // Verify password was NOT changed
    const user = await userRepository.findById('user-cp-1');
    expect(user).not.toBeNull();
    expect(user!.passwordHash.value).toBe(`mem:${originalPassword}`);

    // No event emitted
    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw NotFoundError when user does not exist', async () => {
    const { ChangePasswordUseCase } = await import(
      '@/modules/users/application/use-cases/change-password-use-case'
    );

    const useCase = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'nonexistent',
        currentPassword: originalPassword,
        newPassword,
      }),
    ).rejects.toThrow('User not found');
  });

  it('should reject password change for a deleted (deactivated) user', async () => {
    // Soft-delete the user
    const user = await userRepository.findById('user-cp-1');
    await userRepository.update({
      ...user!,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const { ChangePasswordUseCase } = await import(
      '@/modules/users/application/use-cases/change-password-use-case'
    );

    const useCase = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'user-cp-1',
        currentPassword: originalPassword,
        newPassword,
      }),
    ).rejects.toThrow('Account is deactivated');

    // Verify password was NOT changed
    const updatedUser = await userRepository.findById('user-cp-1');
    expect(updatedUser!.passwordHash.value).toBe(`mem:${originalPassword}`);

    // No event emitted
    expect(outboxRepository.events.length).toBe(0);
  });
});
