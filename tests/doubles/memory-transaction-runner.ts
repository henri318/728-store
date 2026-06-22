import type { TransactionRunner } from '@/shared/kernel/transaction-runner';

/**
 * In-memory TransactionRunner test double.
 *
 * Just calls the callback with `undefined` as the transaction client.
 * The in-memory repositories ignore `tx`, so all writes land in the
 * shared in-memory stores. This is enough to test the use case's
 * happy path and pre-flight validation.
 *
 * Tests that need true atomic rollback semantics (e.g. "if seller write
 * fails, user write is reverted") must stub the underlying repository
 * to throw, then assert the work callback was aborted.
 */
export class MemoryTransactionRunner implements TransactionRunner {
  async run<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
    return work(undefined);
  }
}
