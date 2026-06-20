import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { CreateRoleDTO } from '@/modules/roles/application/dto/create-role.dto';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import type { RoleEntity } from '@/modules/roles/domain/entities/role';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';

export class CreateRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: CreateRoleDTO): Promise<RoleEntity> {
    // 1. Validate name is non-empty
    const trimmedName = dto.name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError('Role name cannot be empty');
    }

    // 2. Check uniqueness
    const exists = await this.roleRepository.existsByName(trimmedName);
    if (exists) {
      throw new ConflictError(`Role "${trimmedName}" already exists`);
    }

    // 3. Build and persist the role entity
    const role: RoleEntity = {
      id: RoleId.create(crypto.randomUUID()),
      name: trimmedName,
      description: dto.description.trim(),
    };

    const saved = await this.roleRepository.save(role);

    // 4. Emit domain event
    await this.outboxRepository.saveEvent(GlobalEvents.ROLE_CREATED, {
      roleId: saved.id.value,
      name: saved.name,
    });

    return saved;
  }
}
