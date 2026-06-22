import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import type { ForgotPasswordEmailPort } from '@/shared/contracts/email/forgot-password-email-port';
import { Base64ResetTokenCodec } from '@/modules/auth/infrastructure/base64-reset-token-codec';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/**
 * Task 2.7 — ForgotPasswordUseCase tests
 *
 * Spec scenarios:
 * - GIVEN registered email WHEN forgot-password submitted THEN mock EmailPort called with token; "If email exists, link sent"
 * - GIVEN unregistered email WHEN submitted THEN same message (no enumeration)
 */

describe('ForgotPasswordUseCase', () => {
  let userRepository: MemoryUserRepository;
  let emailPort: ForgotPasswordEmailPort;
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

    // Mock EmailPort — track calls
    emailPort = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    // Use Base64ResetTokenCodec (jsdom-safe — no Web Crypto needed)
    tokenCodec = new Base64ResetTokenCodec();
  });

  it('should call EmailPort.send with a token when email exists', async () => {
    const { ForgotPasswordUseCase } =
      await import('@/modules/users/application/use-cases/forgot-password-use-case');

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      emailPort,
      tokenCodec,
    );

    const result = await useCase.execute({ email: 'forgot@example.com' });

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );

    // EmailPort.send called with the email and a non-empty token
    expect(emailPort.send).toHaveBeenCalledTimes(1);
    expect(emailPort.send).toHaveBeenCalledWith(
      'forgot@example.com',
      expect.any(String),
    );

    const [calledEmail, calledToken] = (
      emailPort.send as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(calledEmail).toBe('forgot@example.com');
    expect(calledToken).toBeTruthy();
    expect(typeof calledToken).toBe('string');
    expect(calledToken.length).toBeGreaterThan(10);

    // Verify the token can be decoded back
    const decoded = tokenCodec.decode(calledToken!);
    expect(decoded.email).toBe('forgot@example.com');
  });

  it('should return success without calling EmailPort when email does NOT exist (anti-enumeration)', async () => {
    const { ForgotPasswordUseCase } =
      await import('@/modules/users/application/use-cases/forgot-password-use-case');

    const useCase = new ForgotPasswordUseCase(
      userRepository,
      emailPort,
      tokenCodec,
    );

    const result = await useCase.execute({
      email: 'nonexistent@example.com',
    });

    // Same success message — no enumeration
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );

    // EmailPort.send NOT called
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it('should NOT send email when user is deactivated (deletedAt)', async () => {
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
      emailPort,
      tokenCodec,
    );

    const result = await useCase.execute({ email: 'forgot@example.com' });

    // Still returns success (anti-enumeration), but email NOT sent
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'If the email exists, a reset link has been sent',
    );
    expect(emailPort.send).not.toHaveBeenCalled();
  });
});
