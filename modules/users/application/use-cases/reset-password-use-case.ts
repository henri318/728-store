import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import type { ResetTokenCodec } from '@/modules/auth/domain/reset-token-codec-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { UsedResetTokenStorePort } from '@/modules/auth/domain/used-reset-token-store-port';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UnauthorizedError, ConflictError } from '@/shared/kernel/app-error';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenCodec: ResetTokenCodec,
    private readonly outboxRepository: OutboxRepository,
    private readonly usedTokenStore: UsedResetTokenStorePort,
  ) {}

  async execute(dto: ResetPasswordDTO) {
    // 1. Decode token — throws on invalid/expired
    let payload: { email: string; jti?: string };
    try {
      payload = await this.tokenCodec.decode(dto.token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // 2. Check token reuse (replay protection)
    if (payload.jti && this.usedTokenStore.isTokenUsed(payload.jti)) {
      throw new ConflictError('This reset link has already been used');
    }

    // 3. Find user by email from token
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 4. Reject if account is deactivated
    if (user.deletedAt) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // 5. Hash new password
    const hashedPassword = await this.passwordHasher.hash(dto.newPassword);
    const newPasswordHash = PasswordHash.create(hashedPassword);

    // 6. Update user
    await this.userRepository.update({
      ...user,
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    // 7. Mark token as used to prevent replay
    if (payload.jti) {
      this.usedTokenStore.markTokenUsed(payload.jti);
    }

    // 8. Emit PASSWORD_RESET event
    await this.outboxRepository.saveEvent(GlobalEvents.PASSWORD_RESET, {
      userId: user.userId.value,
    });

    return { success: true, message: 'Password has been reset successfully' };
  }
}
