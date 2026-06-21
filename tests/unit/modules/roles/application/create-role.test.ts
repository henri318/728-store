import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRoleRepository } from '@/tests/doubles/memory-role-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';

describe('CreateRoleUseCase', () => {
  let roleRepository: MemoryRoleRepository;
  let outboxRepository: MemoryOutboxRepository;

  // We use a lazy import pattern — the use case class will be imported
  // once it exists (GREEN phase). For RED, we reference it in the test
  // body via a forward declaration that will fail to compile until the
  // file exists.

  beforeEach(() => {
    roleRepository = new MemoryRoleRepository();
    outboxRepository = new MemoryOutboxRepository();
  });

  it('should create a new role successfully and persist it', async () => {
    // Dynamic import — will fail in RED phase because the module doesn't exist yet
    const { CreateRoleUseCase } =
      await import('@/modules/roles/application/use-cases/create-role-use-case');

    const useCase = new CreateRoleUseCase(roleRepository, outboxRepository);

    const result = await useCase.execute({
      name: 'MANAGER',
      description: 'Store manager with elevated access',
    });

    expect(result.id).toBeInstanceOf(RoleId);
    expect(result.name).toBe('MANAGER');
    expect(result.description).toBe('Store manager with elevated access');

    // Verify persistence
    const saved = await roleRepository.findByName('MANAGER');
    expect(saved).not.toBeNull();
    expect(saved!.name).toBe('MANAGER');
  });

  it('should emit a ROLE_CREATED event via the outbox', async () => {
    const { CreateRoleUseCase } =
      await import('@/modules/roles/application/use-cases/create-role-use-case');

    const useCase = new CreateRoleUseCase(roleRepository, outboxRepository);

    const result = await useCase.execute({
      name: 'MANAGER',
      description: 'Store manager',
    });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe('role.created');
    const payload = outboxRepository.events[0].payload as {
      roleId: string;
      name: string;
    };
    expect(payload.roleId).toBe(result.id.value);
    expect(payload.name).toBe('MANAGER');
  });

  it('should throw ConflictError when creating a duplicate role name', async () => {
    const { CreateRoleUseCase } =
      await import('@/modules/roles/application/use-cases/create-role-use-case');

    const useCase = new CreateRoleUseCase(roleRepository, outboxRepository);

    // Seed an existing role
    await roleRepository.save({
      id: RoleId.create('existing-admin'),
      name: 'ADMIN',
      description: 'Administrator',
    });

    await expect(
      useCase.execute({ name: 'ADMIN', description: 'Duplicate admin' }),
    ).rejects.toThrow('Role "ADMIN" already exists');
  });

  it('should throw ValidationError when name is empty', async () => {
    const { CreateRoleUseCase } =
      await import('@/modules/roles/application/use-cases/create-role-use-case');

    const useCase = new CreateRoleUseCase(roleRepository, outboxRepository);

    await expect(
      useCase.execute({ name: '', description: 'No name' }),
    ).rejects.toThrow('Role name cannot be empty');
  });

  it('should throw ValidationError when name is whitespace only', async () => {
    const { CreateRoleUseCase } =
      await import('@/modules/roles/application/use-cases/create-role-use-case');

    const useCase = new CreateRoleUseCase(roleRepository, outboxRepository);

    await expect(
      useCase.execute({ name: '   ', description: 'Whitespace name' }),
    ).rejects.toThrow('Role name cannot be empty');
  });
});
