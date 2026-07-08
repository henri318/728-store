import { prisma } from '@/shared/infrastructure/prisma';
import { Prisma } from '@prisma/client';
import type {
  CreateEmailQueueInput,
  EmailQueueEntry,
  EmailQueueRepository,
  EmailQueueWorkerEntry,
} from '@/shared/contracts/email/email-queue-port';

/**
 * Prisma adapter for the EmailQueueRepository port.
 *
 * Maps the kernel EmailQueueEntry shape to the EmailQueue Prisma model
 * and back. This is the only file that knows about the Prisma model shape.
 *
 * The 4 worker methods (claimPending, markSent, markFailed, reschedule) are
 * the seam that lets workers/email-worker.ts stay free of prisma.*
 * imports — the worker resolves them through the container.
 */
export class PrismaEmailQueueRepository implements EmailQueueRepository {
  private toWorkerEntry(row: {
    id: string;
    to: string;
    subject: string;
    htmlBody: string;
    template: string | null;
    metadata: unknown;
    idempotencyKey: string;
    createdAt: Date;
    status: string;
    retryCount: number;
    maxRetries: number;
    scheduledAt: Date;
  }): EmailQueueWorkerEntry {
    return {
      id: row.id,
      to: row.to,
      subject: row.subject,
      htmlBody: row.htmlBody,
      template: row.template ?? '',
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      status: row.status,
      retryCount: row.retryCount,
      maxRetries: row.maxRetries,
      scheduledAt: row.scheduledAt,
    };
  }

  async create(entry: CreateEmailQueueInput): Promise<EmailQueueEntry> {
    try {
      const row = await prisma.emailQueue.create({
        data: {
          to: entry.to,
          subject: entry.subject,
          htmlBody: entry.htmlBody,
          template: entry.template,
          metadata: entry.metadata as Prisma.InputJsonValue,
          idempotencyKey: entry.idempotencyKey,
        },
      });

      return {
        id: row.id,
        to: row.to,
        subject: row.subject,
        htmlBody: row.htmlBody,
        template: row.template ?? '',
        metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
        idempotencyKey: row.idempotencyKey,
        createdAt: row.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const row = await prisma.emailQueue.findFirst({
          where: { idempotencyKey: entry.idempotencyKey },
        });

        if (row) {
          console.warn(
            '[PrismaEmailQueueRepository] Recovered duplicate email queue entry',
            {
              idempotencyKey: entry.idempotencyKey,
              template: entry.template,
            },
          );

          return {
            id: row.id,
            to: row.to,
            subject: row.subject,
            htmlBody: row.htmlBody,
            template: row.template ?? '',
            metadata:
              (row.metadata as Record<string, unknown> | null) ?? undefined,
            idempotencyKey: row.idempotencyKey,
            createdAt: row.createdAt,
          };
        }

        console.warn(
          '[PrismaEmailQueueRepository] Duplicate email queue insert could not be recovered',
          {
            idempotencyKey: entry.idempotencyKey,
            template: entry.template,
          },
        );
      }

      throw error;
    }
  }

  async findRecentByRecipient(
    email: string,
    template: string,
    since: Date,
  ): Promise<EmailQueueEntry | null> {
    const row = await prisma.emailQueue.findFirst({
      where: {
        to: email,
        template,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) return null;

    return {
      id: row.id,
      to: row.to,
      subject: row.subject,
      htmlBody: row.htmlBody,
      template: row.template ?? '',
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Worker operations
  // -------------------------------------------------------------------------

  /**
   * Atomically claim up to batchSize entries that are due for processing.
   *
   * PostgreSQL's FOR UPDATE SKIP LOCKED lets concurrent drainers claim
   * different rows without waiting on each other or returning duplicates.
   */
  async claimPending(
    now: Date,
    batchSize: number,
  ): Promise<EmailQueueWorkerEntry[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        to: string;
        subject: string;
        htmlBody: string;
        template: string | null;
        metadata: unknown;
        idempotencyKey: string;
        createdAt: Date;
        status: string;
        retryCount: number;
        maxRetries: number;
        scheduledAt: Date;
      }>
    >(Prisma.sql`
      WITH claimed AS (
        SELECT "id"
        FROM "EmailQueue"
        WHERE "status" = 'PENDING'
          AND "scheduledAt" <= ${now}
        ORDER BY "scheduledAt" ASC, "createdAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      UPDATE "EmailQueue" AS q
      SET "status" = 'PROCESSING'
        , "updatedAt" = ${now}
      FROM claimed
      WHERE q."id" = claimed."id"
      RETURNING
        q."id",
        q."to",
        q."subject",
        q."htmlBody",
        q."template",
        q."metadata",
        q."idempotencyKey",
        q."createdAt",
        q."status",
        q."retryCount",
        q."maxRetries",
        q."scheduledAt"
    `);

    return rows.map((row) => this.toWorkerEntry(row));
  }

  async recoverStaleProcessing(
    now: Date,
    staleAfterMs: number,
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - staleAfterMs);
    const result = await prisma.emailQueue.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lte: cutoff },
      },
      data: {
        status: 'PENDING',
        error: null,
      },
    });

    return result.count;
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await prisma.emailQueue.update({
      where: { id },
      data: { status: 'SENT', sentAt, error: null },
    });
  }

  async markFailed(
    id: string,
    error: string,
    retryCount: number,
  ): Promise<void> {
    await prisma.emailQueue.update({
      where: { id },
      data: { status: 'FAILED', error, retryCount },
    });
  }

  async reschedule(
    id: string,
    retryCount: number,
    scheduledAt: Date,
    error: string,
  ): Promise<void> {
    await prisma.emailQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount,
        scheduledAt,
        error,
      },
    });
  }
}
