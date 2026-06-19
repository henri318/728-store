import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { resetPasswordSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

/**
 * POST /api/auth/reset-password
 * Public endpoint — validates a password-reset token and updates the user's password.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(await req.json());

    // Decode and validate token — throws on invalid/expired
    const tokenCodec = container.getResetTokenCodec();
    let payload: { email: string };
    try {
      payload = await tokenCodec.decode(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 },
      );
    }

    // Find user by email from token
    const userRepository = container.getUserRepository();
    const user = await userRepository.findByEmail(payload.email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Hash new password
    const passwordHasher = container.getPasswordHasher();
    const hashedPassword = await passwordHasher.hash(newPassword);
    const newPasswordHash = PasswordHash.create(hashedPassword);

    // Update user
    await userRepository.update({
      ...user,
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    // Emit event
    const outboxRepository = container.getOutboxRepository();
    await outboxRepository.saveEvent(GlobalEvents.PASSWORD_RESET, {
      userId: user.userId.value,
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
