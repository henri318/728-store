import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { SendVerificationEmailUseCase } from '@/modules/auth/application/send-verification-email';
import { container } from '@/composition-root/container';
import { signupSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = signupSchema.parse(await req.json());

    // Rate limiting removed: the previous X-Forwarded-For / X-Real-IP based
    // check is trivially spoofable by setting request headers, giving a false
    // sense of security. Replace with a server-side rate limiter (e.g. Upstash
    // Ratelimit) before re-enabling signup throttling.

    // Composition root — retrieve every dependency from the container.
    // No direct Prisma imports — the container is the only place that knows
    // about concrete adapters.
    const userRepository = container.getUserRepository();
    const outboxRepository = container.getOutboxRepository();
    const passwordHasher = container.getPasswordHasher();

    const registerUser = new RegisterUserUseCase(userRepository, outboxRepository, passwordHasher);

    const user = await registerUser.execute({
      name,
      email,
      password,
    });

    // Delegate email verification to the application use case
    const sendVerificationEmail = new SendVerificationEmailUseCase(
      container.getSecrets(),
      container.getEmailQueueRepository(),
    );

    await sendVerificationEmail.execute({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
