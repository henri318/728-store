import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryRoleRepository } from '@/tests/doubles/memory-role-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import type { RoleValidatorPort } from '@/modules/users/domain/ports/role-validator-port';

/**
 * Test adapter — bridges MemoryRoleRepository to RoleValidatorPort interface.
 */
class TestRoleValidatorAdapter implements RoleValidatorPort {
  constructor(private readonly repo: MemoryRoleRepository) {}

  async findByName(name: string) {
    const role = await this.repo.findByName(name);
    if (!role) return null;
    return { id: role.id.value, name: role.name };
  }
}

describe('AssignRoleUseCase', () => {
  let userRepository: MemoryUserRepository;
  let roleRepository: MemoryRoleRepository;
  let roleValidator: TestRoleValidatorAdapter;
  let outboxRepository: MemoryOutboxRepository;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    roleRepository = new MemoryRoleRepository();
    roleValidator = new TestRoleValidatorAdapter(roleRepository);
    outboxRepository = new MemoryOutboxRepository();
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should assign a role to a user and emit ROLE_ASSIGNED event', async () => {
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
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed role
    await roleRepository.save({
      id: RoleId.create('role-admin-uuid'),
      name: 'ADMIN',
      description: 'Administrator role',
    });

    const { AssignRoleUseCase } =
      await import('@/modules/users/application/use-cases/assign-role-use-case');
    const useCase = new AssignRoleUseCase(
      userRepository,
      roleValidator,
      outboxRepository,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      roleName: 'ADMIN',
      assignedBy: 'admin-user-1',
    });

    // User now has the ADMIN role (role.id from the role entity, not the name)
    expect(result.roleId).toBeInstanceOf(RoleId);
    expect(result.roleId.value).toBe('role-admin-uuid');

    // Verify persistence
    const updated = await userRepository.findById('user-1');
    expect(updated!.roleId.value).toBe('role-admin-uuid');

    // Event emitted with roleId
    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      GlobalEvents.ROLE_ASSIGNED,
    );
    const payload = outboxRepository.events[0].payload as {
      userId: string;
      roleId: string;
      roleName: string;
      assignedBy: string;
    };
    expect(payload.userId).toBe('user-1');
    expect(payload.roleId).toBe('role-admin-uuid');
    expect(payload.roleName).toBe('ADMIN');
    expect(payload.assignedBy).toBe('admin-user-1');
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when user does not exist', async () => {
    const { AssignRoleUseCase } =
      await import('@/modules/users/application/use-cases/assign-role-use-case');
    const useCase = new AssignRoleUseCase(
      userRepository,
      roleValidator,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'nonexistent',
        roleName: 'ADMIN',
        assignedBy: 'admin-1',
      }),
    ).rejects.toThrow('User not found');
  });

  it('should throw when user is deactivated', async () => {
    // Seed a deactivated user
    const userId = UserId.create('user-deactivated');
    await userRepository.save({
      userId,
      email: Email.create('deactivated@example.com'),
      firstName: 'Dead',
      lastName: 'Account',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    });

    const { AssignRoleUseCase } =
      await import('@/modules/users/application/use-cases/assign-role-use-case');
    const useCase = new AssignRoleUseCase(
      userRepository,
      roleValidator,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'user-deactivated',
        roleName: 'ADMIN',
        assignedBy: 'admin-1',
      }),
    ).rejects.toThrow('Account is deactivated');
  });

  it('should throw NotFoundError when role does not exist', async () => {
    // Seed a user
    const userId = UserId.create('user-1');
    await userRepository.save({
      userId,
      email: Email.create('user@example.com'),
      firstName: 'Test',
      lastName: 'User',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { AssignRoleUseCase } =
      await import('@/modules/users/application/use-cases/assign-role-use-case');
    const useCase = new AssignRoleUseCase(
      userRepository,
      roleValidator,
      outboxRepository,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        roleName: 'NONEXISTENT',
        assignedBy: 'admin-1',
      }),
    ).rejects.toThrow('not found');
  });
});
