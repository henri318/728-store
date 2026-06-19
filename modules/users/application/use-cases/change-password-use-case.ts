import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError, UnauthorizedError } from '@/shared/kernel/app-error';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

export interface ChangePasswordDTO {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: ChangePasswordDTO) {
    // 1. Find user
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Verify current password
    const isValid = await this.passwordHasher.verify(
      dto.currentPassword,
      user.passwordHash.value,
    );
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 3. Hash the new password
    const newHash = await this.passwordHasher.hash(dto.newPassword);
    const newPasswordHash = PasswordHash.create(newHash);

    // 4. Persist updated user
    await this.userRepository.update({
      ...user,
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    // 5. Emit PASSWORD_CHANGED event
    await this.outboxRepository.saveEvent(GlobalEvents.PASSWORD_CHANGED, {
      userId: user.userId.value,
    });

    return { success: true };
  }
}
