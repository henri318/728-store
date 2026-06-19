import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { ResetPasswordUseCase } from '@/modules/users/application/use-cases/reset-password-use-case';
import { resetPasswordSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * POST /api/auth/reset-password
 * Public endpoint — validates a password-reset token and updates the user's password.
 * Uses ResetPasswordUseCase for business logic (hexagonal: thin route, fat use case).
 */
export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(await req.json());

    // Rate limit by IP — prevent abuse of this public endpoint
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const rateLimiter = container.getRateLimiter();
    // Use IP-based key to avoid global blocking across all users.
    // A static string would share rate-limit state for everyone.
    const rateCheck = await rateLimiter.checkRateLimit(ip, ip);
    if (rateCheck.blocked) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const userRepository = container.getUserRepository();
    const passwordHasher = container.getPasswordHasher();
    const tokenCodec = container.getResetTokenCodec();
    const outboxRepository = container.getOutboxRepository();
    const usedTokenStore = container.getUsedResetTokenStore();

    const useCase = new ResetPasswordUseCase(
      userRepository,
      passwordHasher,
      tokenCodec,
      outboxRepository,
      usedTokenStore,
    );

    const result = await useCase.execute({ token, newPassword });

    // Record successful attempt — legitimate requests should not count
    // against rate limits. Only errors (catch block) are recorded as failures.
    await rateLimiter.recordLoginAttempt(ip, ip, true);

    return NextResponse.json(result);
  } catch (error: unknown) {
    // Record rate-limiting on errors too
    try {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown';
      await container.getRateLimiter().recordLoginAttempt(ip, ip, false);
    } catch {
      // Silently ignore rate-limiter failures during error handling
    }
    return handleApiError(error);
  }
}
