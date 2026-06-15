import { randomUUID } from 'crypto';
import type { OutboxEvent, OutboxRepository } from '@/shared/kernel/outbox-repository';

type SeedableEvent = Omit<OutboxEvent, 'processedAt'> & { processedAt?: Date | null };

/**
 * In-memory OutboxRepository test double.
 *
 * Implements the production `OutboxRepository` port but stores events in a
 * plain array. Test cases inspect `events` (legacy shape) and `allEvents()`
 * (full shape) to assert the expected domain events.
 *
 * This is the ONLY place in the test suite that should construct an
 * outbox — production code never imports from `tests/doubles/`.
 */
export class MemoryOutboxRepository implements OutboxRepository {
  /** Internal store — full OutboxEvent shape. */
  private store: OutboxEvent[] = [];

  /** Backward-compat shape used by existing tests. */
  public get events(): { eventType: string; payload: any }[] {
    return this.store.map(({ eventType, payload }) => ({ eventType, payload }));
  }

  async saveEvent(eventType: string, payload: any, _tx?: any): Promise<void> {
    this.store.push({
      id: randomUUID(),
      eventType,
      payload,
      status: 'PENDING',
      createdAt: new Date(),
    });
  }

  async findPending(limit: number): Promise<OutboxEvent[]> {
    return this.store
      .filter((e) => e.status === 'PENDING')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async markProcessed(id: string): Promise<void> {
    const e = this.store.find((x) => x.id === id);
    if (!e) return;
    e.status = 'PROCESSED';
    e.processedAt = new Date();
  }

  async markFailed(id: string): Promise<void> {
    const e = this.store.find((x) => x.id === id);
    if (!e) return;
    e.status = 'FAILED';
  }

  /** Test helper — return the full list of stored events. */
  allEvents(): OutboxEvent[] {
    return [...this.store];
  }

  /** Test helper — seed an event directly (bypassing saveEvent). */
  seedEvent(event: SeedableEvent): void {
    this.store.push({
      status: 'PENDING',
      processedAt: null,
      ...event,
    });
  }
}
