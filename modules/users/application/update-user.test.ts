import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

describe('UpdateUserUseCase', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should update firstName and lastName and emit USER_UPDATED with changedFields', async () => {
    // Seed existing user
    const userId = UserId.create('user-1');
    await userRepository.save({
      userId,
      email: Email.create('test@example.com'),
      firstName: 'John',
      lastName: 'Doe',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
    expect(result.userId.value).toBe('user-1');

    // Event emitted with correct type and payload
    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.USER_UPDATED);
    expect(outboxRepository.events[0].payload.userId).toBe('user-1');
    expect(outboxRepository.events[0].payload.changedFields).toContain('firstName');
    expect(outboxRepository.events[0].payload.changedFields).toContain('lastName');

    // Persistence verified
    const updated = await userRepository.findById('user-1');
    expect(updated!.firstName).toBe('Jane');
    expect(updated!.lastName).toBe('Smith');
  });

  it('should update only firstName and report only that field as changed', async () => {
    const userId = UserId.create('user-2');
    await userRepository.save({
      userId,
      email: Email.create('partial@example.com'),
      firstName: 'OldFirst',
      lastName: 'OldLast',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    const result = await useCase.execute({
      userId: 'user-2',
      firstName: 'NewFirst',
    });

    expect(result.firstName).toBe('NewFirst');
    expect(result.lastName).toBe('OldLast'); // unchanged
    expect(outboxRepository.events[0].payload.changedFields).toEqual(['firstName']);
  });

  it('should update address when provided', async () => {
    const userId = UserId.create('user-addr');
    await userRepository.save({
      userId,
      email: Email.create('addr@example.com'),
      firstName: 'Addr',
      lastName: 'User',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    const result = await useCase.execute({
      userId: 'user-addr',
      address: { street: 'Calle 1', city: 'BOG', postalCode: '110111', country: 'CO' },
    });

    expect(result.address).not.toBeNull();
    expect(result.address!.street).toBe('Calle 1');
    expect(result.address!.city).toBe('BOG');
    expect(outboxRepository.events[0].payload.changedFields).toContain('address');
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when user does not exist', async () => {
    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    await expect(
      useCase.execute({ userId: 'nonexistent', firstName: 'Someone' }),
    ).rejects.toThrow('User not found');
  });

  it('should reject empty firstName', async () => {
    const userId = UserId.create('user-empty');
    await userRepository.save({
      userId,
      email: Email.create('valid@example.com'),
      firstName: 'Valid',
      lastName: 'Name',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    await expect(
      useCase.execute({ userId: 'user-empty', firstName: '   ' }),
    ).rejects.toThrow('First name is required');
  });

  it('should reject firstName exceeding max length', async () => {
    const userId = UserId.create('user-long');
    await userRepository.save({
      userId,
      email: Email.create('long@example.com'),
      firstName: 'Short',
      lastName: 'Name',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { UpdateUserUseCase } = await import('./use-cases/update-user-use-case');
    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);

    await expect(
      useCase.execute({ userId: 'user-long', firstName: 'A'.repeat(51) }),
    ).rejects.toThrow('cannot exceed');
  });
});
