import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRoleRepository } from '@/tests/doubles/memory-role-repository';

describe('SeedRolesUseCase', () => {
  let roleRepository: MemoryRoleRepository;

  beforeEach(() => {
    roleRepository = new MemoryRoleRepository();
  });

  it('should seed four default roles when the repository is empty', async () => {
    const { SeedRolesUseCase } = await import('@/modules/roles/application/use-cases/seed-roles-use-case');

    const useCase = new SeedRolesUseCase(roleRepository);

    const result = await useCase.execute();

    expect(result).toHaveLength(4);

    const names = result.map(r => r.name).sort();
    expect(names).toEqual(['ADMIN', 'CUSTOMER', 'DESIGNER', 'SUPPORT']);

    // Verify each role has a non-empty description
    for (const role of result) {
      expect(role.description.length).toBeGreaterThan(0);
      expect(role.id).toBeDefined();
    }
  });

  it('should be idempotent — second execution is a no-op', async () => {
    const { SeedRolesUseCase } = await import('@/modules/roles/application/use-cases/seed-roles-use-case');

    const useCase = new SeedRolesUseCase(roleRepository);

    // First run seeds the roles
    const firstRun = await useCase.execute();
    expect(firstRun).toHaveLength(4);

    // Second run should return the same 4 roles (no new inserts)
    const secondRun = await useCase.execute();
    expect(secondRun).toHaveLength(4);

    // Verify no duplicates in the repository
    const allRoles = await roleRepository.findAll();
    expect(allRoles).toHaveLength(4);
  });

  it('should not insert when all four roles already exist', async () => {
    const { SeedRolesUseCase } = await import('@/modules/roles/application/use-cases/seed-roles-use-case');

    // Pre-seed all four roles manually
    const { RoleId } = await import('@/modules/roles/domain/value-objects/role-id');
    const seedData = [
      { name: 'ADMIN', description: 'System administrator' },
      { name: 'SUPPORT', description: 'Customer support agent' },
      { name: 'DESIGNER', description: 'Product designer' },
      { name: 'CUSTOMER', description: 'Registered customer' },
    ];

    for (const r of seedData) {
      await roleRepository.save({
        id: RoleId.create(`existing-${r.name.toLowerCase()}`),
        name: r.name,
        description: r.description,
      });
    }

    const useCase = new SeedRolesUseCase(roleRepository);

    const result = await useCase.execute();
    expect(result).toHaveLength(4);

    // All roles should have the original IDs (not overwritten)
    const admin = await roleRepository.findByName('ADMIN');
    expect(admin!.id.value).toBe('existing-admin');

    // No extra roles
    const allRoles = await roleRepository.findAll();
    expect(allRoles).toHaveLength(4);
  });
});
