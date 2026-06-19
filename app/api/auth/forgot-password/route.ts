import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { ForgotPasswordUseCase } from '@/modules/users/application/use-cases/forgot-password-use-case';
import { ConsoleForgotPasswordEmail } from '@/modules/auth/infrastructure/console-forgot-password-email';
import { forgotPasswordSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * POST /api/auth/forgot-password
 * Public endpoint — accepts an email and (if registered) dispatches a
 * password-reset email via the ForgotPasswordEmailPort.
 *
 * Always returns success to prevent user enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = forgotPasswordSchema.parse(await req.json());

    const userRepository = container.getUserRepository();
    const emailPort = new ConsoleForgotPasswordEmail(); // Mock — logs to console in dev
    const tokenCodec = container.getResetTokenCodec();

    const useCase = new ForgotPasswordUseCase(userRepository, emailPort, tokenCodec);
    const result = await useCase.execute({ email });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
