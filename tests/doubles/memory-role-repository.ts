import type { RoleEntity } from '@/modules/roles/domain/entities/role';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';

/**
 * In-memory RoleRepository test double.
 *
 * Implements the production `RoleRepository` port but stores entities in a
 * plain array. Test cases inspect the internal store to verify persistence
 * and uniqueness checks.
 */
export class MemoryRoleRepository implements RoleRepository {
  private roles: RoleEntity[] = [];

  async save(role: RoleEntity): Promise<RoleEntity> {
    const existingIndex = this.roles.findIndex(r => r.name === role.name);
    if (existingIndex >= 0) {
      this.roles[existingIndex] = role;
    } else {
      this.roles.push(role);
    }
    return role;
  }

  async findAll(): Promise<RoleEntity[]> {
    return [...this.roles];
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return this.roles.find(r => r.name === name) ?? null;
  }

  async existsByName(name: string): Promise<boolean> {
    return this.roles.some(r => r.name === name);
  }
}
