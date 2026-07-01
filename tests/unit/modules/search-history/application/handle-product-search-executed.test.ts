import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandleProductSearchExecuted } from '@/modules/search-history/application/handle-product-search-executed';
import { RecordSearchUseCase } from '@/modules/search-history/application/record-search-use-case';
import { MemorySearchHistoryRepository } from '@/tests/doubles/memory-search-history-repository';
import type { ProductSearchExecutedPayload } from '@/modules/search-history/domain/search-events';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';

function makePayload(
  overrides: Partial<ProductSearchExecutedPayload> = {},
): ProductSearchExecutedPayload {
  return {
    userId: 'user-1',
    term: 'ceramic',
    locale: 'es',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

class SpyEventBus implements EventBusPort {
  handlers = new Map<string, ((data: unknown) => void | Promise<void>)[]>();
  on(event: string, fn: (data: unknown) => void | Promise<void>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }
  async emit(event: string, data: unknown): Promise<void> {
    const list = this.handlers.get(event) ?? [];
    for (const fn of list) await fn(data);
  }
}

describe('HandleProductSearchExecuted (event subscriber)', () => {
  let repo: MemorySearchHistoryRepository;
  let record: RecordSearchUseCase;
  let handler: HandleProductSearchExecuted;

  beforeEach(() => {
    repo = new MemorySearchHistoryRepository();
    record = new RecordSearchUseCase(repo);
    handler = new HandleProductSearchExecuted(record);
  });

  it('records the search for an authenticated user', async () => {
    await handler.handle(makePayload({ userId: 'user-1', term: 'ceramic' }));

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].term).toBe('ceramic');
  });

  it('is a no-op when userId is null (guest)', async () => {
    await handler.handle(makePayload({ userId: null, term: 'ceramic' }));

    // No row written under any userId.
    const all = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(all).toEqual([]);
  });

  it('does not throw when the payload is null', async () => {
    await expect(
      handler.handle(null as unknown as ProductSearchExecutedPayload),
    ).resolves.toBeUndefined();
  });

  it('does not throw when the payload is missing required fields', async () => {
    await expect(
      handler.handle({} as unknown as ProductSearchExecutedPayload),
    ).resolves.toBeUndefined();
  });

  it('subscribe() registers a handler on the bus that processes the event', async () => {
    const bus = new SpyEventBus();
    HandleProductSearchExecuted.subscribe(bus, handler);

    await bus.emit(
      GlobalEvents.PRODUCT_SEARCH_EXECUTED,
      makePayload({ term: 'lamp' }),
    );

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries[0].term).toBe('lamp');
  });

  it('subscribe() handler swallows errors so a single failure does not break the bus', async () => {
    const bus = new SpyEventBus();
    const brokenHandler = new HandleProductSearchExecuted({
      // Force an internal error path that the subscriber can recover from.
      // record() will receive a non-string term; RecordSearchUseCase rejects
      // empty terms silently, so we pass an unusable payload to exercise
      // the defensive try/catch.
      // We don't have a public method to force a throw, so this case
      // is a smoke test: subscriber calls handle() and the bus still
      // resolves.
    } as unknown as RecordSearchUseCase);
    // Stub handle to throw so we can verify the wrapper catches it.
    vi.spyOn(brokenHandler, 'handle').mockRejectedValueOnce(new Error('boom'));
    HandleProductSearchExecuted.subscribe(bus, brokenHandler);

    await expect(
      bus.emit(GlobalEvents.PRODUCT_SEARCH_EXECUTED, makePayload()),
    ).resolves.toBeUndefined();
  });
});
