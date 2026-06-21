import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { ForgotPasswordUseCase } from '@/modules/users/application/use-cases/forgot-password-use-case';
import { forgotPasswordSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * POST /api/auth/forgot-password
 * Public endpoint — accepts an email and (if registered and active) dispatches a
 * password-reset email via the ForgotPasswordEmailPort.
 *
 * Always returns success to prevent user enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = forgotPasswordSchema.parse(await req.json());

    // Rate limit by IP — prevent abuse of this public endpoint
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const rateLimiter = container.getRateLimiter();
    const rateCheck = await rateLimiter.checkRateLimit(email, ip);
    if (rateCheck.blocked) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const userRepository = container.getUserRepository();
    const emailPort = container.getForgotPasswordEmailPort();
    const tokenCodec = container.getResetTokenCodec();

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      emailPort,
      tokenCodec,
    );
    const result = await useCase.execute({ email });

    // Record successful attempt — legitimate requests should not count
    // against rate limits. Only errors (catch block) are recorded as failures.
    await rateLimiter.recordLoginAttempt(email, ip, true);

    return NextResponse.json(result);
  } catch (error: unknown) {
    // Record rate-limiting on errors too — every request should count
    try {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown';
      await container.getRateLimiter().recordLoginAttempt('unknown', ip, false);
    } catch {
      // Silently ignore rate-limiter failures during error handling
    }
    return handleApiError(error);
  }
}
