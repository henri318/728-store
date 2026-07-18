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

    // Check deletedAt gate
    const userRepository = container.getUserRepository();
    const user = await userRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.deletedAt) {
      return NextResponse.json(
        { error: 'Account deactivated' },
        { status: 401 },
      );
    }

    const address = await userRepository.findAddressByUserId(userId);

    return NextResponse.json({
      id: user.userId.value,
      email: user.email.value,
      firstName: user.firstName,
      lastName: user.lastName,
      address,
      emailVerified: user.emailVerified?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
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
    const { address, ...profileFields } = body;

    const userRepository = container.getUserRepository();
    const outboxRepository = container.getOutboxRepository();

    const useCase = new UpdateUserUseCase(userRepository, outboxRepository);
    const updated = await useCase.execute({
      userId,
      ...profileFields,
    });

    if (address !== undefined) {
      if (address) {
        await userRepository.saveAddress(userId, address);
      }
      if (address === null) {
        await userRepository.clearAddress(userId);
      }
    }

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
