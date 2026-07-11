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

  it('subscribe propagates handler errors (does not swallow)', async () => {
    const handlers: Record<string, (p: unknown) => Promise<void>> = {};
    const fakeBus = {
      on: (event: string, h: (p: unknown) => Promise<void>) => {
        handlers[event] = h;
      },
      emit: vi.fn(),
    };

    // Make create throw to trigger handler error
    const failingQueueRepo = {
      create: vi.fn().mockRejectedValue(new Error('create boom')),
      findRecentByRecipient: vi.fn(),
      claimPending: vi.fn(),
      recoverStaleProcessing: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
      reschedule: vi.fn(),
    };

    vi.mocked(deps.emailUserLookup.findById).mockResolvedValue({
      email: 'user@test.com',
      firstName: 'Test',
      locale: 'es',
    });

    EmailEventSubscribers.subscribeAll(fakeBus as unknown as EventBusPort, {
      ...deps,
      emailQueueRepository: failingQueueRepo,
    });

    // Provide complete payload so handler doesn't return early
    await expect(
      handlers[GlobalEvents.PASSWORD_RESET_REQUESTED]({
        userId: 'u1',
        email: 'user@test.com',
        token: 'tok',
        expiresAt: '2099-01-01',
      }),
    ).rejects.toThrow('create boom');
  });
});
