import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';
import { renderEmailTemplate } from '@/modules/email/application/templates/template-registry';
import { HandlePasswordResetRequested } from '@/modules/email/application/handlers/handle-password-reset-requested';
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';

vi.mock('@/shared/kernel/config', () => ({
  getBaseUrl: vi.fn(() => 'https://app.test'),
}));

describe('HandlePasswordResetRequested', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let userLookup: EmailUserLookupPort;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    userLookup = {
      findById: vi.fn(),
      findEmailByUserId: vi.fn(),
    };
  });

  it('queues a password-reset email with the expected template and token-based idempotency key', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue({
      email: 'user@test.com',
      firstName: 'Ana',
      locale: 'fr',
    });

    const handler = new HandlePasswordResetRequested(
      queueRepository,
      userLookup,
    );
    await handler.handle({
      userId: 'user-1',
      email: 'user@test.com',
      token: 'reset-token',
      expiresAt: '2026-07-08T10:30:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(1);
    const entry = queueRepository.all()[0];
    expect(entry).toMatchObject({
      to: 'user@test.com',
      template: 'password-reset',
      metadata: {
        userId: 'user-1',
        expiresAt: '2026-07-08T10:30:00.000Z',
      },
    });
    expect(entry.idempotencyKey).toBe(
      buildIdempotencyKey('password-reset', 'user@test.com', 'reset-token'),
    );

    expect(entry.subject).toBe('Restablecé tu contraseña');
    expect(entry.htmlBody).toContain('Hola Ana');
    expect(entry.htmlBody).toContain(
      '/es/auth/reset-password?token=reset-token',
    );
    expect(entry.htmlBody).toContain('2026-07-08T10:30:00.000Z');

    expect(
      renderEmailTemplate('password-reset', 'fr', {
        name: 'Ana',
        resetLink: 'https://example.test/reset?token=reset-token',
        expiresAt: '2026-07-08T10:30:00.000Z',
      }).subject,
    ).toBe(entry.subject);
  });

  it('creates a fresh queue entry for a new reset token for the same user', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue({
      email: 'user@test.com',
      firstName: 'Ana',
      locale: 'fr',
    });

    const handler = new HandlePasswordResetRequested(
      queueRepository,
      userLookup,
    );

    await handler.handle({
      userId: 'user-1',
      email: 'user@test.com',
      token: 'reset-token-a',
      expiresAt: '2026-07-08T10:30:00.000Z',
    });

    await handler.handle({
      userId: 'user-1',
      email: 'user@test.com',
      token: 'reset-token-b',
      expiresAt: '2026-07-08T10:35:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(2);
    expect(queueRepository.all().map((entry) => entry.idempotencyKey)).toEqual([
      buildIdempotencyKey('password-reset', 'user@test.com', 'reset-token-a'),
      buildIdempotencyKey('password-reset', 'user@test.com', 'reset-token-b'),
    ]);
  });

  it('does nothing when the user lookup returns null', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue(null);

    const handler = new HandlePasswordResetRequested(
      queueRepository,
      userLookup,
    );
    await handler.handle({
      userId: 'missing-user',
      email: 'missing@test.com',
      token: 'reset-token',
      expiresAt: '2026-07-08T10:30:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(0);
  });

  it.each([
    null,
    undefined,
    {},
    { userId: 'user-1' },
    { email: 'user@test.com' },
    { token: 'reset-token' },
    { expiresAt: '2026-07-08T10:30:00.000Z' },
  ])('does nothing for malformed payloads: %s', async (payload) => {
    const handler = new HandlePasswordResetRequested(
      queueRepository,
      userLookup,
    );

    await handler.handle(
      payload as Parameters<HandlePasswordResetRequested['handle']>[0],
    );

    expect(userLookup.findById).not.toHaveBeenCalled();
    expect(queueRepository.all()).toHaveLength(0);
  });
});
