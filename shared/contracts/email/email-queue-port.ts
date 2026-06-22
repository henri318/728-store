import type { EmailQueueEntry } from '@/modules/email/domain/entities/email-queue-entry';
import type { EmailQueueWorkerEntry } from '@/modules/email/domain/entities/email-queue-worker-entry';

export type { EmailQueueEntry, EmailQueueWorkerEntry };

export type CreateEmailQueueInput = Omit<EmailQueueEntry, 'id' | 'createdAt'>;

/**
 * EmailQueueRepository — the port for persisting outbound emails durably.
 *
 * Production implementation: PrismaEmailQueueRepository (in email/infrastructure).
 * Test implementation:      MemoryEmailQueueRepository (in tests/doubles).
 *
 * The architecture splits responsibility:
 *   Route     →  queueRepository.create()      (durable, retried by the worker)
 *   Worker    →  claimPending() + send via EmailSender + markSent/markFailed/reschedule
 *
 * The worker methods (claimPending, markSent, markFailed, reschedule) are
 * part of the same port so the worker has zero direct prisma imports.
 */
export interface EmailQueueRepository {
  /**
   * Persist a new email queue entry.
   * The implementation is responsible for assigning a unique id and
   * the `createdAt` timestamp.
   */
  create(entry: CreateEmailQueueInput): Promise<EmailQueueEntry>;

  /**
   * Return the most recent entry for a recipient/template that was queued
   * on or after `since`. Used by the resend flow to rate-limit.
   */
  findRecentByRecipient(
    email: string,
    template: string,
    since: Date,
  ): Promise<EmailQueueEntry | null>;

  // -------------------------------------------------------------------------
  // Worker operations
  // -------------------------------------------------------------------------

  /**
   * Atomically claim up to `batchSize` entries that are due for processing.
   * The implementation MUST mark the returned entries as PROCESSING and
   * persist the state change in the same transaction/operation.
   *
   * @param now         The current time; entries with `scheduledAt <= now`
   *                    and status PENDING are eligible.
   * @param batchSize   Maximum number of entries to claim.
   */
  claimPending(now: Date, batchSize: number): Promise<EmailQueueWorkerEntry[]>;

  /** Mark a claimed entry as successfully sent. */
  markSent(id: string, sentAt: Date): Promise<void>;

  /** Mark a claimed entry as failed (retry budget exhausted). */
  markFailed(id: string, error: string, retryCount: number): Promise<void>;

  /**
   * Reschedule a claimed entry for a future retry with exponential backoff.
   * `scheduledAt` MUST be in the future.
   */
  reschedule(
    id: string,
    retryCount: number,
    scheduledAt: Date,
    error: string,
  ): Promise<void>;
}
