import type { OutboxRepository } from '@/shared/kernel/outbox-repository';

/**
 * In-memory OutboxRepository test double.
 *
 * Implements the production `OutboxRepository` port but stores events in a
 * plain array. Test cases inspect `events` to assert that the use case
 * emitted the expected domain events.
 *
 * This is the ONLY place in the test suite that should construct an
 * outbox — production code never imports from `tests/doubles/`.
 */
export class MemoryOutboxRepository implements OutboxRepository {
  public events: { eventType: string; payload: any }[] = [];

  async saveEvent(eventType: string, payload: any): Promise<void> {
    this.events.push({ eventType, payload });
  }
}
