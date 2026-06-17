import type { RoleEntity } from '@/modules/roles/domain/entities/role';

/**
 * Repository port for role persistence operations.
 *
 * Production implementation: PrismaRoleRepository (modules/roles/infrastructure/).
 * Test implementation:        MemoryRoleRepository (tests/doubles/).
 */
export interface RoleRepository {
  /** Persist a role entity. */
  save(role: RoleEntity): Promise<RoleEntity>;

  /** Return all roles in the catalog. */
  findAll(): Promise<RoleEntity[]>;

  /** Find a single role by its unique name, or null if not found. */
  findByName(name: string): Promise<RoleEntity | null>;

  /** Check whether a role name already exists in the catalog. */
  existsByName(name: string): Promise<boolean>;
}
