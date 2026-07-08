import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const findByEmailMock = vi.fn();
  const findRecentByRecipientMock = vi.fn();
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

  return {
    findByEmailMock,
    findRecentByRecipientMock,
    createMock,
    buildIdempotencyKeyMock,
    signMock,
  };
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

vi.mock('@/composition-root/container', () => ({
  container: {
    getUserRepository: () => ({
      findByEmail: mocks.findByEmailMock,
    }),
    getEmailQueueRepository: () => ({
      findRecentByRecipient: mocks.findRecentByRecipientMock,
      create: mocks.createMock,
    }),
    getSecrets: () => ({
      getAuthSecret: () => new Uint8Array([1, 2, 3]),
    }),
  },
}));

vi.mock('@/shared/kernel/config', () => ({
  getBaseUrl: () => 'https://example.test',
}));

vi.mock('@/shared/kernel/escape-html', () => ({
  escapeHtml: (value: string) => value,
}));

import { POST } from '@/app/api/auth/resend-verification/route';

function makeRequest(email: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared idempotency key helper when queueing the verification email', async () => {
    mocks.findByEmailMock.mockResolvedValue({
      userId: { value: 'user-1' },
      firstName: 'User',
      deletedAt: null,
      emailVerified: false,
    });
    mocks.findRecentByRecipientMock.mockResolvedValue(null);

    const response = await POST(makeRequest('user@test.com'));

    expect(response.status).toBe(200);
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
