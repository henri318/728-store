/**
 * OutboxRepository — the port for persisting domain events atomically.
 *
 * Production implementation: PrismaOutboxRepository (in shared/infrastructure).
 * Test implementation:      MemoryOutboxRepository (in tests/doubles).
 *
 * Used by the Transactional Outbox Pattern: use cases persist events in the
 * same transaction as the business change via this port. A background worker
 * (OutboxWorker) later reads pending events and dispatches them to the
 * event bus.
 *
 * Keeping the interface in `shared/kernel` (the pure, dependency-free layer)
 * lets every module depend on it without dragging in Prisma or test doubles.
 */
export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: any;
  status: string;
  createdAt: Date;
  processedAt?: Date | null;
}

export interface OutboxRepository {
  /**
   * Persist a new event in the same transaction as the business operation.
   * The optional `tx` argument is the Prisma transaction client — only
   * the Prisma adapter uses it; in-memory implementations ignore it.
   */
  saveEvent(eventType: string, payload: any, tx?: any): Promise<void>;

  /**
   * Return PENDING events, oldest first, up to `limit`.
   * Used by the OutboxWorker to fetch the next batch to dispatch.
   */
  findPending(limit: number): Promise<OutboxEvent[]>;

  /**
   * Mark an event as PROCESSED — set its status and processedAt timestamp.
   * Called by the worker after a successful dispatch.
   */
  markProcessed(id: string): Promise<void>;

  /**
   * Mark an event as FAILED — set its status to FAILED.
   * Called by the worker when the handler throws.
   */
  markFailed(id: string): Promise<void>;
}
