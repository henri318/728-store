import { prisma } from '@/shared/infrastructure/prisma';
import type { Prisma } from '@prisma/client';
import type {
  CreateEmailQueueInput,
  EmailQueueEntry,
  EmailQueueRepository,
  EmailQueueWorkerEntry,
} from '@/shared/contracts/email/email-queue-port';

/**
 * Prisma adapter for the EmailQueueRepository port.
 *
 * Maps the kernel `EmailQueueEntry` shape to the `EmailQueue` Prisma model
 * and back. This is the only file that knows about the Prisma model shape.
 *
 * The 4 worker methods (claimPending, markSent, markFailed, reschedule) are
 * the seam that lets `workers/email-worker.ts` stay free of `prisma.*`
 * imports — the worker resolves them through the container.
 */
export class PrismaEmailQueueRepository implements EmailQueueRepository {
  async create(entry: CreateEmailQueueInput): Promise<EmailQueueEntry> {
    const row = await prisma.emailQueue.create({
      data: {
        to: entry.to,
        subject: entry.subject,
        htmlBody: entry.htmlBody,
        template: entry.template,
        metadata: entry.metadata as Prisma.InputJsonValue,
      },
    });

    return {
      id: row.id,
      to: row.to,
      subject: row.subject,
      htmlBody: row.htmlBody,
      template: row.template ?? '',
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      createdAt: row.createdAt,
    };
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
      createdAt: row.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Worker operations
  // -------------------------------------------------------------------------

  /**
   * Atomically claim up to `batchSize` entries that are due for processing.
   * Implemented as: find PENDING + scheduledAt <= now, then updateMany
   * marking them PROCESSING. Both operations hit the same model so the
   * race window is small; for stricter guarantees a transaction can be
   * added later.
   */
  async claimPending(
    now: Date,
    batchSize: number,
  ): Promise<EmailQueueWorkerEntry[]> {
    const due = await prisma.emailQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      take: batchSize,
      orderBy: { scheduledAt: 'asc' },
    });

    if (due.length === 0) return [];

    // Mark them as PROCESSING. The simple equality-by-id update is safe
    // because each entry has a unique id and the same worker is the only
    // writer transitioning to PROCESSING in this design.
    const ids = due.map((r) => r.id);
    await prisma.emailQueue.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    return due.map((row) => this.toWorkerEntry(row));
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

  private toWorkerEntry(row: {
    id: string;
    to: string;
    subject: string;
    htmlBody: string;
    template: string | null;
    metadata: unknown;
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
      createdAt: row.createdAt,
      status: row.status,
      retryCount: row.retryCount,
      maxRetries: row.maxRetries,
      scheduledAt: row.scheduledAt,
    };
  }
}
