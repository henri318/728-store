import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaRoleRepository } from '@/modules/roles/infrastructure/prisma-role-repository';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import type { RoleEntity } from '@/modules/roles/domain/entities/role';

/**
 * PrismaRoleRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies CRUD operations and name-based lookups through the actual
 * Prisma adapter (no mocks).
 */
describe('PrismaRoleRepository — Integration', () => {
  let repo: PrismaRoleRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaRoleRepository();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  function makeRole(overrides: Partial<RoleEntity> = {}): RoleEntity {
    return {
      id: RoleId.create('role-int-1'),
      name: 'TEST_ROLE',
      description: 'A test role',
      ...overrides,
    };
  }

  describe('save + findByName', () => {
    it('should persist a role and retrieve it by name', async () => {
      const role = makeRole();
      const saved = await repo.save(role);

      expect(saved.name).toBe('TEST_ROLE');
      expect(saved.description).toBe('A test role');

      const found = await repo.findByName('TEST_ROLE');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('TEST_ROLE');
      expect(found!.description).toBe('A test role');
    });

    it('should upsert on name conflict (update description)', async () => {
      await repo.save(makeRole({ description: 'Original' }));

      const updated = await repo.save(makeRole({ description: 'Updated' }));
      expect(updated.description).toBe('Updated');

      const found = await repo.findByName('TEST_ROLE');
      expect(found!.description).toBe('Updated');
    });

    it('should return null for non-existent name', async () => {
      const found = await repo.findByName('NON_EXISTENT');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all roles ordered by name', async () => {
      await repo.save(
        makeRole({
          id: RoleId.create('role-alpha'),
          name: 'ALPHA',
          description: 'Alpha role',
        }),
      );
      await repo.save(
        makeRole({
          id: RoleId.create('role-beta'),
          name: 'BETA',
          description: 'Beta role',
        }),
      );

      const all = await repo.findAll();
      const names = all.map((r) => r.name);
      expect(names).toContain('ALPHA');
      expect(names).toContain('BETA');
      expect(names).toContain('TEST_ROLE');
    });
  });

  describe('existsByName', () => {
    it('should return true for existing role', async () => {
      const exists = await repo.existsByName('TEST_ROLE');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent role', async () => {
      const exists = await repo.existsByName('GHOST_ROLE');
      expect(exists).toBe(false);
    });
  });
});
