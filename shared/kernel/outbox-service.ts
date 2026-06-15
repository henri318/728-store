import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';

/**
 * OutboxService — orchestrates the dispatch loop.
 *
 * Architecture:
 *   Use case  →  outboxRepository.saveEvent(event, payload, tx)   (durable write)
 *   Worker    →  outboxService.processEvents()                    (drain queue)
 *
 * The service no longer imports Prisma directly — it consumes the
 * OutboxRepository port. Event emission goes through the EventBusPort
 * so tests can inject a fresh in-memory bus and avoid handler leakage
 * between cases.
 */
export class OutboxService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Drain pending events from the outbox:
   *  1. Fetch a batch of PENDING events
   *  2. For each: emit on the bus, then mark PROCESSED (or FAILED on throw)
   *  3. Continue with the rest of the batch even if one event fails
   */
  async processEvents(): Promise<void> {
    const pending = await this.outboxRepository.findPending(20);

    for (const event of pending) {
      try {
        await this.eventBus.emit(event.eventType, event.payload);
        await this.outboxRepository.markProcessed(event.id);
      } catch (error) {
        console.error(`[Outbox] Error processing event ${event.id}:`, error);
        await this.outboxRepository.markFailed(event.id);
      }
    }
  }
}
