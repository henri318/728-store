import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { MemoryUserRepository } from '@/modules/users/infrastructure/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { verifyPassword } from '@/shared/infrastructure/password-hasher';

describe('RegisterUserUseCase with bcrypt', () => {
  let userRepo: MemoryUserRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    outboxRepo = new MemoryOutboxRepository();
    useCase = new RegisterUserUseCase(userRepo, outboxRepo);
  });

  it('should store a hashed password, not the raw password', async () => {
    const rawPassword = 'MiPassword123!';
    await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
      password: rawPassword, // raw password
    });

    const savedUser = await userRepo.findByEmail('test@example.com');

    expect(savedUser).toBeDefined();
    expect(savedUser!.passwordHash).not.toBe(rawPassword);
    expect(savedUser!.passwordHash).toMatch(/^\$2[ab]\$.{56}$/); // bcrypt format
  });

  it('should store a password that can be verified with bcrypt', async () => {
    const rawPassword = 'MiPassword123!';
    await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
      password: rawPassword,
    });

    const savedUser = await userRepo.findByEmail('test@example.com');
    const isValid = await verifyPassword(rawPassword, savedUser!.passwordHash);

    expect(isValid).toBe(true);
  });

  it('should still record a USER_REGISTERED event', async () => {
    await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
      password: 'MiPassword123!',
    });

    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0].eventType).toBe('user.registered');
  });
});
