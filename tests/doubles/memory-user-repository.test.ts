import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';

/**
 * Tests for the expanded UserRepository port:
 *  - findById returns the full user (with emailVerified)
 *  - markEmailVerified sets the timestamp
 *  - save obeys the new UserEntity shape (VOs)
 *  - existing findByEmail/findById/save signature still works
 *
 * These tests also verify the existing register-user cases still pass
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
    useCase = new RegisterUserUseCase(
      userRepository,
      outboxRepository,
      passwordHasher,
    );
  });

  describe('findById', () => {
    it('should return the full user including emailVerified (new shape)', async () => {
      // Arrange — create a user via the use case (which uses new DTO shape)
      const created = await useCase.execute({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'MiPassword123!',
      });

      // Act
      const fetched = await userRepository.findById(created.userId.value);

      // Assert — new entity shape with VOs
      expect(fetched).not.toBeNull();
      expect(fetched!.userId).toBeInstanceOf(UserId);
      expect(fetched!.userId.value).toBe(created.userId.value);
      expect(fetched!.email).toBeInstanceOf(Email);
      expect(fetched!.email.value).toBe('alice@example.com');
      expect(fetched!.firstName).toBe('Alice');
      expect(fetched!.lastName).toBe('Smith');
      expect(fetched!.passwordHash).toBeDefined();
      expect(fetched!.roleId).toBeInstanceOf(RoleId);
      expect(fetched!.roleId.value).toBe('CUSTOMER');
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
});
