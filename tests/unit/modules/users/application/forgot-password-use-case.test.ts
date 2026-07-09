import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { Base64ResetTokenCodec } from '@/modules/auth/infrastructure/base64-reset-token-codec';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Task 4.1 — ForgotPasswordUseCase tests
 *
 * Spec scenarios:
 * - GIVEN registered email WHEN forgot-password submitted THEN PASSWORD_RESET_REQUESTED is emitted
 * - GIVEN unregistered email WHEN submitted THEN same message (no enumeration)
 */

describe('ForgotPasswordUseCase', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let tokenCodec: Base64ResetTokenCodec;

  beforeEach(async () => {
    userRepository = new MemoryUserRepository();

    // Seed a test user
    await userRepository.save({
      userId: UserId.create('user-fp-1'),
      email: Email.create('forgot@example.com'),
      firstName: 'Forgot',
      lastName: 'Password',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashedpassword123'),
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    outboxRepository = new MemoryOutboxRepository();

    // Use Base64ResetTokenCodec (jsdom-safe — no Web Crypto needed)
    tokenCodec = new Base64ResetTokenCodec();
  });

  it('emits PASSWORD_RESET_REQUESTED with a reset token when email exists', async () => {
    const { ForgotPasswordUseCase } =
      await import('@/modules/users/application/use-cases/forgot-password-use-case');

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      tokenCodec,
      outboxRepository,
    );

    const result = await useCase.execute({ email: 'forgot@example.com' });

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );

    expect(outboxRepository.allEvents()).toHaveLength(1);
    expect(outboxRepository.allEvents()[0]?.eventType).toBe(
      GlobalEvents.PASSWORD_RESET_REQUESTED,
    );
    expect(outboxRepository.allEvents()[0]?.payload).toMatchObject({
      userId: 'user-fp-1',
      email: 'forgot@example.com',
      expiresAt: expect.any(String),
    });

    const payload = outboxRepository.allEvents()[0]?.payload as {
      token: string;
      email: string;
    };
    expect(payload.token).toBeTruthy();
    expect(typeof payload.token).toBe('string');
    expect(payload.token.length).toBeGreaterThan(10);

    // Verify the token can be decoded back
    const decoded = tokenCodec.decode(payload.token);
    expect(decoded.email).toBe('forgot@example.com');
  });

  it('should return success without emitting an event when email does NOT exist (anti-enumeration)', async () => {
    const { ForgotPasswordUseCase } =
      await import('@/modules/users/application/use-cases/forgot-password-use-case');

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      tokenCodec,
      outboxRepository,
    );

    const result = await useCase.execute({
      email: 'nonexistent@example.com',
    });

    // Same success message — no enumeration
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );

    expect(outboxRepository.allEvents()).toHaveLength(0);
  });

  it('should NOT emit an event when user is deactivated (deletedAt)', async () => {
    const { ForgotPasswordUseCase } =
      await import('@/modules/users/application/use-cases/forgot-password-use-case');

    // Soft-delete the seeded user
    const user = await userRepository.findByEmail('forgot@example.com');
    expect(user).not.toBeNull();
    await userRepository.save({
      ...user!,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      tokenCodec,
      outboxRepository,
    );

    const result = await useCase.execute({ email: 'forgot@example.com' });

    // Still returns success (anti-enumeration), but email NOT sent
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );
    expect(outboxRepository.allEvents()).toHaveLength(0);
  });
});
