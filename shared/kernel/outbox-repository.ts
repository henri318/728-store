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
export interface OutboxRepository {
  saveEvent(eventType: string, payload: any): Promise<void>;
}
