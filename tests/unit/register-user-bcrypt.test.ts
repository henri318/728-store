import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { hashPassword, verifyPassword } from '@/modules/users/infrastructure/bcrypt-password-hasher';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/** Bcrypt adapter that matches the PasswordHasher port — real bcrypt, no mocks. */
const bcryptHasher: PasswordHasher = { hash: hashPassword, verify: verifyPassword };

describe('RegisterUserUseCase with bcrypt', () => {
  let userRepo: MemoryUserRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    outboxRepo = new MemoryOutboxRepository();
    useCase = new RegisterUserUseCase(userRepo, outboxRepo, bcryptHasher);
  });

  it('should store a hashed password, not the raw password', async () => {
    const rawPassword = 'MiPassword123!';
    await useCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: rawPassword,
    });

    const savedUser = await userRepo.findByEmail('test@example.com');

    expect(savedUser).toBeDefined();
    expect(savedUser!.passwordHash.value).not.toBe(rawPassword);
    expect(savedUser!.passwordHash.value).toMatch(/^\$2[ab]\$.{56}$/); // bcrypt format
  });

  it('should store a password that can be verified with bcrypt', async () => {
    const rawPassword = 'MiPassword123!';
    await useCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: rawPassword,
    });

    const savedUser = await userRepo.findByEmail('test@example.com');
    const isValid = await bcryptHasher.verify(rawPassword, savedUser!.passwordHash.value);

    expect(isValid).toBe(true);
  });

  it('should still record a USER_REGISTERED event', async () => {
    await useCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'MiPassword123!',
    });

    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0].eventType).toBe(GlobalEvents.USER_REGISTERED);
  });
});
