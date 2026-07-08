import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/kernel/config', () => ({
  getBaseUrl: vi.fn(() => 'https://app.test'),
}));

import { EventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { EmailEventSubscribers } from '@/modules/email/application/email-event-subscribers';
import type { EmailQueueDrainService } from '@/modules/email/application/email-queue-drain-service';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';

type DrainMock = EmailQueueDrainService['drain'] & {
  mockRejectedValue(value: unknown): DrainMock;
  mockReset(): DrainMock;
};

describe('EmailEventSubscribers inline drain', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let userLookup: EmailUserLookupPort;
  let drainMock: DrainMock;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    userLookup = {
      findById: vi.fn(),
      findEmailByUserId: vi.fn(),
    };
    drainMock = vi.fn() as unknown as DrainMock;
  });

  it('keeps the request flow alive when the inline drain fails after enqueueing', async () => {
    vi.mocked(userLookup.findById).mockResolvedValue({
      email: 'seller@test.com',
      firstName: 'Lucia',
      locale: 'es',
    });
    drainMock.mockRejectedValue(new Error('background drain failed'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const eventBus = new EventBus();

    EmailEventSubscribers.subscribeAll(eventBus, {
      emailQueueRepository: queueRepository,
      emailUserLookup: userLookup,
      emailOrderLookup: {
        findBuyerContextByOrderId: vi.fn(),
        getSummaryForEmail: vi.fn(),
      },
      emailQueueDrainer: { drain: drainMock },
    });

    await expect(
      eventBus.emit(GlobalEvents.SELLER_CREATED, {
        sellerId: 'seller-1',
        userId: 'user-1',
        name: 'Tienda Norte',
      }),
    ).resolves.toBeUndefined();

    expect(queueRepository.all()).toHaveLength(1);
    expect(drainMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[EmailEventSubscribers] Inline email queue drain failed',
      expect.objectContaining({
        event: 'SellerCreated',
        source: 'inline',
      }),
    );
  });
});
