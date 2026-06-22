import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * Prisma adapter for the TransactionRunner port.
 *
 * Delegates to `prisma.$transaction` so every write inside the callback
 * is part of a single DB transaction. If the callback throws, all writes
 * are rolled back atomically.
 */
export class PrismaTransactionRunner implements TransactionRunner {
  async run<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
    // Prisma's overloaded $transaction can't infer the callback signature
    // through the generic `unknown` port type, so we cast at the boundary.
    return prisma.$transaction(work as never) as Promise<T>;
  }
}
