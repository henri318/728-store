import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { EmailEventSubscribers } from '@/modules/email/application/email-event-subscribers';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';
import type { EmailOrderLookupPort } from '@/modules/email/domain/ports/email-order-lookup-port';

vi.mock('@/shared/kernel/config', () => ({
  getBaseUrl: vi.fn(() => 'https://app.test'),
}));

describe('EmailEventSubscribers', () => {
  let eventBus: EventBusPort;
  let deps: {
    emailQueueRepository: MemoryEmailQueueRepository;
    emailUserLookup: EmailUserLookupPort;
    emailOrderLookup: EmailOrderLookupPort;
  };

  beforeEach(() => {
    eventBus = { on: vi.fn(), emit: vi.fn() };
    deps = {
      emailQueueRepository: new MemoryEmailQueueRepository(),
      emailUserLookup: { findById: vi.fn(), findEmailByUserId: vi.fn() },
      emailOrderLookup: {
        findBuyerContextByOrderId: vi.fn(),
        getSummaryForEmail: vi.fn(),
      },
    };
  });

  it('registers all v1 transactional email subscribers', () => {
    EmailEventSubscribers.subscribeAll(eventBus, deps);

    const onMock = eventBus.on as unknown as {
      mock: { calls: Array<[string, unknown]> };
    };

    expect(eventBus.on).toHaveBeenCalledTimes(5);
    expect(onMock.mock.calls.map(([event]) => event)).toEqual([
      GlobalEvents.PASSWORD_RESET_REQUESTED,
      GlobalEvents.SELLER_CREATED,
      GlobalEvents.ORDER_CREATED,
      GlobalEvents.ORDER_PAID,
      GlobalEvents.ORDER_READY_FOR_PRODUCTION,
    ]);
  });
});
