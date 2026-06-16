import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { RegisterUserUseCase } from './register-user-use-case';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';

/**
 * Tests for the expanded UserRepository port:
 *  - findById returns the full user (with emailVerified)
 *  - markEmailVerified sets the timestamp
 *  - existing findByEmail/findById/save signature still works
 *
 * These tests also verify the existing 3 register-user cases still pass
 * (the MemoryUserRepository is the same one used by register-user-use-case).
 */
describe('MemoryUserRepository — expanded port', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();
    useCase = new RegisterUserUseCase(userRepository, outboxRepository, passwordHasher);
  });

  describe('findById', () => {
    it('should return the full user including emailVerified', async () => {
      // Arrange — create a user
      const created = await useCase.execute({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'MiPassword123!',
      });

      // Act
      const fetched = await userRepository.findById(created.id);

      // Assert
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.email).toBe('alice@example.com');
      expect(fetched!.name).toBe('Alice');
      expect(fetched!.passwordHash).toBeDefined();
      expect(fetched!.role).toBe('client');
      expect(fetched!.emailVerified).toBeNull();
    });

    it('should return null for an unknown id', async () => {
      const fetched = await userRepository.findById('does-not-exist');
      expect(fetched).toBeNull();
    });
  });

  describe('markEmailVerified', () => {
    it('should set emailVerified to a recent Date', async () => {
      // Arrange
      const created = await useCase.execute({
        email: 'bob@example.com',
        name: 'Bob',
        password: 'MiPassword123!',
      });

      // Act
      const before = Date.now();
      await userRepository.markEmailVerified(created.id);
      const after = Date.now();

      // Assert
      const fetched = await userRepository.findById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.emailVerified).toBeInstanceOf(Date);
      const ts = (fetched!.emailVerified as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should be a no-op for an unknown id (no throw)', async () => {
      await expect(userRepository.markEmailVerified('unknown-id')).resolves.toBeUndefined();
    });
  });

  describe('backward compat — register-user flows still pass', () => {
    it('should still register a new user successfully', async () => {
      const result = await useCase.execute({
        email: 'test@example.com',
        name: 'Test User',
        password: 'MiPassword123!',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.id).toBeDefined();

      const savedUser = await userRepository.findByEmail(result.email);
      expect(savedUser?.role).toBe('client');
      expect(savedUser?.name).toBe('Test User');
      expect(savedUser?.emailVerified).toBeNull();
    });

    it('should still record USER_REGISTERED event in the outbox', async () => {
      const result = await useCase.execute({
        email: 'test@example.com',
        name: 'Test User',
        password: 'MiPassword123!',
      });

      expect(outboxRepository.events).toHaveLength(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.USER_REGISTERED);
      expect(outboxRepository.events[0].payload.userId).toBe(result.id);
    });

    it('should still throw if user already exists', async () => {
      const dto = {
        email: 'dup@example.com',
        name: 'Dup',
        password: 'MiPassword123!',
      };
      await useCase.execute(dto);
      await expect(useCase.execute(dto)).rejects.toThrow('User already exists');
    });
  });
});
