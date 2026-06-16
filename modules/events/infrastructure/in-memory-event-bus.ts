/**
 * In-memory implementation of EventBusPort.
 *
 * Suitable for single-process use (Next.js server, worker, scripts).
 * Alternative transports (Redis, NATS) would implement the same
 * EventBusPort interface and be bound through the container.
 */
import type { EventBusPort, EventHandler } from '@/modules/events/domain/event-bus-port';

export class EventBus implements EventBusPort {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    const existingHandlers = this.handlers.get(event) || [];
    this.handlers.set(event, [...existingHandlers, handler]);
  }

  /**
   * Emit an event to all registered handlers.
   *
   * The first handler that throws or rejects will cause `emit` to throw.
   * All other handlers are still awaited (best-effort fan-out), so a
   * downstream subscriber that does its own try/catch isn't short-circuited
   * by an earlier subscriber's failure.
   *
   * We wrap each handler in `Promise.resolve().then(...)` so a synchronous
   * throw inside a handler becomes a rejected promise — otherwise the
   * throw would propagate up through `handlers.map(...)` and stop the
   * fan-out before `Promise.allSettled` could isolate the failure.
   */
  async emit(event: string, data: any): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    // Track errors per-handler; the first one wins
    const settled = await Promise.allSettled(
      handlers.map((handler) => Promise.resolve().then(() => handler(data))),
    );
    const firstRejection = settled.find((r) => r.status === 'rejected');
    if (firstRejection && firstRejection.status === 'rejected') {
      throw firstRejection.reason;
    }
  }
}

/** Process-wide default instance — the production wiring uses this. */
export const eventBus = new EventBus();
