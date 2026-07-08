import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';

const mocks = vi.hoisted(() => {
  const createMock = vi.fn(async () => ({
    id: 'email-1',
    to: 'user@test.com',
    subject: 'Verify your email — Modular Ecommerce',
    htmlBody: '<p>queued</p>',
    template: 'verification',
    metadata: { userId: 'user-1' },
    idempotencyKey: 'mock-idempotency-key',
    createdAt: new Date('2026-07-08T10:00:00.000Z'),
  }));
  const buildIdempotencyKeyMock = vi.fn(() => 'mock-idempotency-key');
  const signMock = vi.fn(async () => 'signed-token');

  return { createMock, buildIdempotencyKeyMock, signMock };
});

vi.mock('@/shared/lib/idempotency-key', () => ({
  buildIdempotencyKey: mocks.buildIdempotencyKeyMock,
}));

vi.mock('jose', () => ({
  SignJWT: class {
    sign = mocks.signMock;

    setProtectedHeader() {
      return this;
    }

    setSubject() {
      return this;
    }

    setIssuedAt() {
      return this;
    }

    setExpirationTime() {
      return this;
    }
  },
}));

vi.mock('@/shared/kernel/config', () => ({
  getBaseUrl: () => 'https://example.test',
}));

vi.mock('@/shared/kernel/escape-html', () => ({
  escapeHtml: (value: string) => value,
}));

import { SendVerificationEmailUseCase } from '@/modules/auth/application/send-verification-email';

describe('SendVerificationEmailUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared idempotency key helper when queuing verification email', async () => {
    const useCase = new SendVerificationEmailUseCase(
      { getAuthSecret: () => new Uint8Array([1, 2, 3]) },
      { create: mocks.createMock } as unknown as EmailQueueRepository,
    );

    await useCase.execute({
      userId: 'user-1',
      email: 'user@test.com',
      name: 'User',
    });

    expect(mocks.buildIdempotencyKeyMock).toHaveBeenCalledWith(
      'verification',
      'user@test.com',
      'user-1',
    );
    expect(mocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'mock-idempotency-key',
        template: 'verification',
      }),
    );
  });
});
