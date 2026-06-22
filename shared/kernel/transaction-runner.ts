/**
 * TransactionRunner — the port for executing a unit of work atomically.
 *
 * Production implementation: PrismaTransactionRunner (in shared/infrastructure).
 * Test implementation:      MemoryTransactionRunner (in tests/doubles).
 *
 * Use this when a use case must persist multiple writes (a business row +
 * an outbox event) so they all succeed or all roll back as a single unit.
 * The callback receives a transaction client `tx` that is passed to every
 * repository call inside the unit of work.
 *
 * Keeping the interface in `shared/kernel` (pure, dependency-free) lets
 * any module depend on it without dragging in Prisma.
 */
export interface TransactionRunner {
  /**
   * Run `work` inside an atomic transaction.
   * The callback receives the transaction client — pass it to every
   * repository call that should be part of the unit of work.
   * If the callback throws, all writes are rolled back.
   */
  run<T>(work: (tx: unknown) => Promise<T>): Promise<T>;
}
