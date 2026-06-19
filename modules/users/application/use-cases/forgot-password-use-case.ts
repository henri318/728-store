import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { ForgotPasswordEmailPort } from '@/modules/auth/domain/forgot-password-email-port';
import type { ResetTokenCodec } from '@/modules/auth/domain/reset-token-codec-port';

export interface ForgotPasswordDTO {
  email: string;
}

/** Token validity: 1 hour in milliseconds. */
const TOKEN_TTL_MS = 3600_000;

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailPort: ForgotPasswordEmailPort,
    private readonly tokenCodec: ResetTokenCodec,
  ) {}

  async execute(dto: ForgotPasswordDTO) {
    // 1. Look up user by email (case-insensitive via repository)
    const user = await this.userRepository.findByEmail(dto.email);

    // 2. If user exists and is NOT deleted, generate token via codec and send via EmailPort
    if (user && !user.deletedAt) {
      const payload = {
        email: user.email.value,
        exp: Date.now() + TOKEN_TTL_MS,
      };
      const token = await this.tokenCodec.encode(payload);
      await this.emailPort.send(user.email.value, token);
    }

    // 3. Always return success — no user enumeration
    return {
      success: true,
      message: 'If the email exists, a reset link has been sent',
    };
  }
}
