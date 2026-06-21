import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { SendVerificationEmailUseCase } from '@/modules/auth/application/send-verification-email';
import { container } from '@/composition-root/container';
import { signupSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, address } =
      signupSchema.parse(await req.json());

    // Composition root — retrieve every dependency from the container.
    // No direct Prisma imports — the container is the only place that knows
    // about concrete adapters.
    const userRepository = container.getUserRepository();
    const outboxRepository = container.getOutboxRepository();
    const passwordHasher = container.getPasswordHasher();

    const registerUser = new RegisterUserUseCase(
      userRepository,
      outboxRepository,
      passwordHasher,
    );

    const user = await registerUser.execute({
      firstName,
      lastName,
      email,
      password,
      address,
    });

    // Delegate email verification to the application use case
    const sendVerificationEmail = new SendVerificationEmailUseCase(
      container.getSecrets(),
      container.getEmailQueueRepository(),
    );

    const displayName = `${user.firstName} ${user.lastName}`.trim();

    await sendVerificationEmail.execute({
      userId: user.userId.value,
      email: user.email.value,
      name: displayName,
    });

    return NextResponse.json({
      id: user.userId.value,
      email: user.email.value,
      message:
        'Registration successful. Please check your email to verify your account.',
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
