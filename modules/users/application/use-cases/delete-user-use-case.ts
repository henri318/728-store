import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError } from '@/shared/kernel/app-error';

export interface DeleteUserDTO {
  userId: string;
}

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: DeleteUserDTO) {
    // 1. Validate user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Check if already soft-deleted
    if (user.deletedAt) {
      throw new NotFoundError('User already deactivated');
    }

    // 3. Soft-delete: set deletedAt timestamp instead of removing the row
    const now = new Date();
    await this.userRepository.update({
      ...user,
      deletedAt: now,
      updatedAt: now,
    });

    // 4. Emit USER_DELETED event
    await this.outboxRepository.saveEvent(GlobalEvents.USER_DELETED, {
      userId: user.userId.value,
    });

    return { deleted: true };
  }
}
