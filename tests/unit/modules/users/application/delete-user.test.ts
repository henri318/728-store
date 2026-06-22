import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

describe('DeleteUserUseCase — soft-delete', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should soft-delete a user (set deletedAt) and emit USER_DELETED event', async () => {
    // Seed user
    const userId = UserId.create('user-1');
    await userRepository.save({
      userId,
      email: Email.create('user@example.com'),
      firstName: 'Test',
      lastName: 'User',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { DeleteUserUseCase } =
      await import('@/modules/users/application/use-cases/delete-user-use-case');
    const useCase = new DeleteUserUseCase(userRepository, outboxRepository);

    await useCase.execute({ userId: 'user-1' });

    // User STILL exists (soft-delete)
    const found = await userRepository.findById('user-1');
    expect(found).not.toBeNull();
    expect(found!.deletedAt).toBeInstanceOf(Date);

    // Event emitted
    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      GlobalEvents.USER_DELETED,
    );
    const payload = outboxRepository.events[0].payload as { userId: string };
    expect(payload.userId).toBe('user-1');
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when user does not exist', async () => {
    const { DeleteUserUseCase } =
      await import('@/modules/users/application/use-cases/delete-user-use-case');
    const useCase = new DeleteUserUseCase(userRepository, outboxRepository);

    await expect(useCase.execute({ userId: 'nonexistent' })).rejects.toThrow(
      'User not found',
    );
  });

  // ── Idempotency ─────────────────────────────────────────────

  it('should throw error when deleting an already-deleted user', async () => {
    const userId = UserId.create('user-2');
    await userRepository.save({
      userId,
      email: Email.create('user2@example.com'),
      firstName: 'Two',
      lastName: 'User',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { DeleteUserUseCase } =
      await import('@/modules/users/application/use-cases/delete-user-use-case');
    const useCase = new DeleteUserUseCase(userRepository, outboxRepository);

    // Soft-delete once
    await useCase.execute({ userId: 'user-2' });

    // Soft-delete again — should throw (already deleted)
    await expect(useCase.execute({ userId: 'user-2' })).rejects.toThrow(
      'User already deactivated',
    );
  });
});
