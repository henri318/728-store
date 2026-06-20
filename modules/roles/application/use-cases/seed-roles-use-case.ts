import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import type { RoleEntity } from '@/modules/roles/domain/entities/role';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';

/** Default role definitions seeded on first boot. */
const DEFAULT_ROLES: Array<{ name: string; description: string }> = [
  { name: 'ADMIN', description: 'System administrator with full access' },
  { name: 'SUPPORT', description: 'Customer support agent' },
  { name: 'DESIGNER', description: 'Product designer with customization access' },
  { name: 'CUSTOMER', description: 'Registered customer' },
];

/**
 * Seeds the four default platform roles (ADMIN, SUPPORT, DESIGNER, CUSTOMER)
 * into the role repository on first boot.
 *
 * Idempotent — if a role already exists, it is not re-inserted.
 * Called from `initContainer()` during application startup.
 */
export class SeedRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<RoleEntity[]> {
    const results: RoleEntity[] = [];

    for (const def of DEFAULT_ROLES) {
      const existing = await this.roleRepository.findByName(def.name);
      if (existing) {
        results.push(existing);
      } else {
        const role: RoleEntity = {
          id: RoleId.create(crypto.randomUUID()),
          name: def.name,
          description: def.description,
        };
        const saved = await this.roleRepository.save(role);
        results.push(saved);
      }
    }

    return results;
  }
}
