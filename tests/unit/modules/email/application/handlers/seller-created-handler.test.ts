import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';
import { HandleSellerCreated } from '@/modules/email/application/handlers/handle-seller-created';
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';

describe('HandleSellerCreated', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let userLookup: EmailUserLookupPort;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    userLookup = {
      findById: vi.fn(),
      findEmailByUserId: vi.fn(),
    };
  });

  it('queues a seller-created email for the seller owner', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue({
      email: 'seller@test.com',
      firstName: 'Lucia',
      locale: 'es',
    });

    const handler = new HandleSellerCreated(queueRepository, userLookup);
    await handler.handle({
      sellerId: 'seller-1',
      userId: 'user-1',
      name: 'Tienda Norte',
    });

    expect(queueRepository.all()).toHaveLength(1);
    const entry = queueRepository.all()[0];
    expect(entry).toMatchObject({
      to: 'seller@test.com',
      template: 'seller-created',
      metadata: {
        sellerId: 'seller-1',
        userId: 'user-1',
        sellerName: 'Tienda Norte',
      },
    });
    expect(entry.idempotencyKey).toBe(
      buildIdempotencyKey('seller-created', 'seller@test.com', 'seller-1'),
    );
    expect(entry.subject).toBe('Tu cuenta de vendedor fue creada');
    expect(entry.htmlBody).toContain('Hola Lucia');
    expect(entry.htmlBody).toContain('Tienda Norte');
  });

  it('does nothing when the seller owner cannot be resolved', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue(null);

    const handler = new HandleSellerCreated(queueRepository, userLookup);
    await handler.handle({
      sellerId: 'seller-1',
      userId: 'missing-user',
      name: 'Tienda Norte',
    });

    expect(queueRepository.all()).toHaveLength(0);
  });

  it.each([
    null,
    undefined,
    {},
    { sellerId: 'seller-1' },
    { userId: 'user-1' },
    { name: 'Tienda Norte' },
  ])('does nothing for malformed payloads: %s', async (payload) => {
    const handler = new HandleSellerCreated(queueRepository, userLookup);

    await handler.handle(
      payload as Parameters<HandleSellerCreated['handle']>[0],
    );

    expect(userLookup.findById).not.toHaveBeenCalled();
    expect(queueRepository.all()).toHaveLength(0);
  });
});
