import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import type { ProductSearchExecutedPayload } from '../domain/search-events';
import { RecordSearchUseCase } from './record-search-use-case';

/**
 * HandleProductSearchExecuted — event-bus subscriber that records
 * search terms for authenticated users.
 *
 * Spec REQ: search-history must be event-driven, never a direct import
 * from the products module. The composition root wires this up; the
 * products module only emits the event via the outbox.
 *
 * Guest semantics:
 *  - `userId === null` → no-op (no DB write, no log noise).
 *  - This is the SOLE mechanism that records recent searches. There
 *    is no localStorage / sessionStorage / cookies fallback. v1 spec.
 *
 * Subscriber contract:
 *  - The static `subscribe()` wraps `handle()` in a try/catch so a
 *    single failure does not break the in-process bus.
 */
export class HandleProductSearchExecuted {
  constructor(private readonly recordSearch: RecordSearchUseCase) {}

  async handle(
    payload: ProductSearchExecutedPayload | null | undefined,
  ): Promise<void> {
    if (!payload) return;
    if (typeof payload.userId !== 'string' || payload.userId.length === 0) {
      return;
    }
    if (typeof payload.term !== 'string' || payload.term.length === 0) {
      return;
    }
    if (typeof payload.locale !== 'string' || payload.locale.length === 0) {
      return;
    }

    await this.recordSearch.execute({
      userId: payload.userId,
      term: payload.term,
      locale: payload.locale,
    });
  }

  /**
   * Wire the handler to the event bus. Mirrors the
   * `HandleCartCheckedOut.subscribe` pattern so HMR doesn't double-register.
   */
  static subscribe(
    eventBus: EventBusPort,
    handler: HandleProductSearchExecuted,
  ): void {
    eventBus.on(GlobalEvents.PRODUCT_SEARCH_EXECUTED, async (data: unknown) => {
      try {
        await handler.handle(data as ProductSearchExecutedPayload);
      } catch (error) {
        console.error('Error processing ProductSearchExecuted event:', error);
      }
    });
  }
}
