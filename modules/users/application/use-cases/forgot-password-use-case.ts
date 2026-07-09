import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { ResetTokenCodec } from '@/shared/contracts/security/reset-token-codec';

export interface ForgotPasswordDTO {
  email: string;
}

/** Token validity: 1 hour in milliseconds. */
const TOKEN_TTL_MS = 3_600_000;

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenCodec: ResetTokenCodec,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: ForgotPasswordDTO) {
    // 1. Look up user by email (case-insensitive via repository)
    const user = await this.userRepository.findByEmail(dto.email);

    // 2. If user exists and is NOT deleted, generate token and persist an outbox event
    if (user && !user.deletedAt) {
      const payload = {
        email: user.email.value,
        exp: Date.now() + TOKEN_TTL_MS,
      };
      const token = await this.tokenCodec.encode(payload);
      const expiresAt = new Date(payload.exp).toISOString();

      await this.outboxRepository.saveEvent(
        GlobalEvents.PASSWORD_RESET_REQUESTED,
        {
          userId: user.userId.value,
          email: user.email.value,
          token,
          expiresAt,
        },
      );
    }

    // 3. Always return success — no user enumeration
    return {
      success: true,
      message: 'If the email exists, a reset link has been sent',
    };
  }
}
