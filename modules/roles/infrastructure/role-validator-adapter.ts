import type {
  RoleValidatorPort,
  RoleValidationResult,
} from '@/modules/users/domain/ports/role-validator-port';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';

/**
 * Adapter — bridges users' RoleValidatorPort to the real roles infrastructure.
 *
 * This is the ONLY place in roles that knows about users' port interface.
 * The port is injected via constructor (received from the container) instead
 * of being hardcoded — this keeps the adapter testable.
 */
export class RoleValidatorAdapter implements RoleValidatorPort {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findByName(name: string): Promise<RoleValidationResult | null> {
    const role = await this.roleRepository.findByName(name);
    if (!role) return null;
    return {
      id: role.id.value,
      name: role.name,
    };
  }
}
