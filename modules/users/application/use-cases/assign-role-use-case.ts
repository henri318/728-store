import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError, UnauthorizedError } from '@/shared/kernel/app-error';

export interface AssignRoleDTO {
  userId: string;
  roleName: string;
  assignedBy: string;
}

export class AssignRoleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: AssignRoleDTO) {
    // 1. Validate user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Reject if account is deactivated (soft-deleted)
    if (user.deletedAt) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // 2. Validate role exists
    const role = await this.roleRepository.findByName(dto.roleName);
    if (!role) {
      throw new NotFoundError(`Role "${dto.roleName}" not found`);
    }

    // 3. Update user's roleId to the role entity's actual id
    const now = new Date();
    const updated = await this.userRepository.update({
      ...user,
      roleId: role.id,
      updatedAt: now,
    });

    // 4. Emit ROLE_ASSIGNED event
    await this.outboxRepository.saveEvent(GlobalEvents.ROLE_ASSIGNED, {
      userId: updated.userId.value,
      roleId: role.id.value,
      roleName: role.name,
      assignedBy: dto.assignedBy,
    });

    return updated;
  }
}
