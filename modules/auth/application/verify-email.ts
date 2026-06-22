import { jwtVerify } from 'jose';
import type { SecretsPort } from '@/modules/auth/domain/secrets';
import type { UserVerificationPort } from '@/modules/auth/domain/ports/user-verification-port';

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailOutput {
  success: boolean;
  message: string;
  statusCode?: number;
}

/**
 * Pure use case — verifies a JWT email verification token and marks the
 * user's email as verified in the database.
 *
 * Dependencies are injected via constructor (ports only), so the use case
 * has ZERO knowledge of Next.js, Prisma, or any concrete adapter.
 */
export class VerifyEmailUseCase {
  constructor(
    private readonly secrets: SecretsPort,
    private readonly userVerification: UserVerificationPort,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutput> {
    const { token } = input;

    const secret = this.secrets.getAuthSecret();
    const { payload } = await jwtVerify(token, secret);

    if ((payload as Record<string, unknown>).purpose !== 'email-verification') {
      return {
        success: false,
        message: 'Invalid token purpose',
        statusCode: 400,
      };
    }

    const userId = payload.sub;
    if (!userId) {
      return {
        success: false,
        message: 'Invalid token payload',
        statusCode: 400,
      };
    }

    // Use the UserVerificationPort — no direct Prisma access
    const user = await this.userVerification.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    // Reject if account is deactivated (soft-deleted)
    if (user.deletedAt) {
      return {
        success: false,
        message: 'Account is deactivated',
        statusCode: 403,
      };
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified' };
    }

    await this.userVerification.markEmailVerified(userId);

    return { success: true, message: 'Email verified' };
  }
}
