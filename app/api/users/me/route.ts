import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { UpdateUserUseCase } from '@/modules/users/application/use-cases/update-user-use-case';
import { DeleteUserUseCase } from '@/modules/users/application/use-cases/delete-user-use-case';
import { updateProfileSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile data.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileUseCase = container.getUserProfileUseCase();
    const profile = await profileUseCase.execute(userId);
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (profile.deletedAt) {
      return NextResponse.json(
        { error: 'Account deactivated' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      id: profile.userId.value,
      email: profile.email.value,
      firstName: profile.firstName,
      lastName: profile.lastName,
      address: profile.deliveryAddress,
      emailVerified: profile.emailVerified?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users/me
 * Updates the current user's profile (firstName, lastName, address).
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = updateProfileSchema.parse(await req.json());
    const { address: fullAddress, ...profileFields } = body;

    const userRepository = container.getUserRepository();
    const outboxRepository = container.getOutboxRepository();

    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);
    const updated = await useCase.execute({
      userId,
      ...profileFields,
      fullAddress,
    });

    const persistedAddress = await userRepository.findAddressByUserId(userId);

    return NextResponse.json({
      id: updated.userId.value,
      email: updated.email.value,
      firstName: updated.firstName,
      lastName: updated.lastName,
      address: persistedAddress,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/users/me
 * Soft-deletes the current user's account (sets deletedAt).
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRepository = container.getUserRepository();
    const outboxRepository = container.getOutboxRepository();

    const useCase = new DeleteUserUseCase(userRepository, outboxRepository);
    const result = await useCase.execute({ userId });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
