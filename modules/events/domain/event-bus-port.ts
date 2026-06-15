/**
 * EventBusPort — the port for in-process pub/sub between modules.
 *
 * Architecture:
 *   Module A  →  eventBus.emit(eventType, payload)   (publish)
 *   Module B  →  eventBus.on(eventType, handler)     (subscribe)
 *
 * The port is declared here in the events module's domain layer.
 * Concrete implementations live in `events/infrastructure/` and
 * are bound through the container.
 *
 * Rules:
 *   - Events are immutable strings (e.g. 'order.paid').
 *   - Handlers are independent — one throwing does not short-circuit
 *     others. The first handler that rejects still causes `emit` to
 *     throw, so failures surface in production.
 *   - Subscriptions are idempotent: re-registering the same handler
 *     adds it again (handlers are kept in a list per event).
 */

export type EventHandler = (data: any) => void | Promise<void>;

/**
 * The port — what production code and tests consume.
 *
 * `emit` is async so future adapters (Redis streams, message brokers)
 * can satisfy the same contract without breaking callers.
 */
export interface EventBusPort {
  /** Register a handler for the given event. Handlers run in order of registration. */
  on(event: string, handler: EventHandler): void;

  /**
   * Fan out an event to every registered handler.
   * Throws the first handler's rejection so failures are visible.
   */
  emit(event: string, data: any): Promise<void>;
}
