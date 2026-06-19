import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { ChangePasswordUseCase } from '@/modules/users/application/use-cases/change-password-use-case';
import { changePasswordSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * POST /api/users/me/change-password
 * Authenticated endpoint — changes the current user's password.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(
      await req.json(),
    );

    const userRepository = container.getUserRepository();
    const passwordHasher = container.getPasswordHasher();
    const outboxRepository = container.getOutboxRepository();

    const useCase = new ChangePasswordUseCase(
      userRepository,
      passwordHasher,
      outboxRepository,
    );

    const result = await useCase.execute({
      userId,
      currentPassword,
      newPassword,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
