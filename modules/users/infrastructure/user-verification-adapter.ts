import type {
  UserVerificationPort,
  UserVerificationResult,
} from '@/modules/auth/domain/ports/user-verification-port';
import type { UserRepository } from '@/modules/users/domain/user-repository';

/**
 * Adapter — bridges auth's UserVerificationPort to the real users infrastructure.
 *
 * This is the ONLY place in users that knows about auth's port interface.
 * The port is injected via constructor (received from the container) instead
 * of being hardcoded — this keeps the adapter testable.
 */
export class UserVerificationAdapter implements UserVerificationPort {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(userId: string): Promise<UserVerificationResult | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    return {
      id: user.userId.value,
      emailVerified: user.emailVerified,
      deletedAt: user.deletedAt ?? null,
    };
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userRepository.markEmailVerified(userId);
  }
}
