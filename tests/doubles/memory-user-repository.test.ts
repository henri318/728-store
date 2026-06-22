import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';

/**
 * Tests for markEmailVerified on the MemoryUserRepository.
 * The findById describe block was removed — it is redundant with
 * register-user-use-case.test.ts which already covers user creation and retrieval.
 */
describe('MemoryUserRepository — markEmailVerified', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();
    useCase = new RegisterUserUseCase(
      userRepository,
      outboxRepository,
      passwordHasher,
    );
  });

  it('should set emailVerified to a recent Date', async () => {
    // Arrange
    const created = await useCase.execute({
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Jones',
      password: 'MiPassword123!',
    });

    // Act
    const before = Date.now();
    await userRepository.markEmailVerified(created.userId.value);
    const after = Date.now();

    // Assert
    const fetched = await userRepository.findById(created.userId.value);
    expect(fetched).not.toBeNull();
    expect(fetched!.emailVerified).toBeInstanceOf(Date);
    const ts = (fetched!.emailVerified as Date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('should be a no-op for an unknown id (no throw)', async () => {
    await expect(
      userRepository.markEmailVerified('unknown-id'),
    ).resolves.toBeUndefined();
  });
});
