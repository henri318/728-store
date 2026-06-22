import { randomUUID } from 'crypto';
import type {
  CreateEmailQueueInput,
  EmailQueueEntry,
  EmailQueueRepository,
  EmailQueueWorkerEntry,
} from '@/shared/contracts/email/email-queue-port';

/**
 * In-memory EmailQueueRepository test double.
 *
 * Implements the production `EmailQueueRepository` port but stores entries
 * in a plain array. Tests can inspect `all()` to assert queued entries.
 *
 * This is the ONLY place in the test suite that should construct one of
 * these — production code never imports from `tests/doubles/`.
 */
export class MemoryEmailQueueRepository implements EmailQueueRepository {
  private entries: (EmailQueueEntry & {
    status: string;
    retryCount: number;
    maxRetries: number;
    scheduledAt: Date;
    sentAt?: Date;
    error?: string | null;
  })[] = [];

  async create(entry: CreateEmailQueueInput): Promise<EmailQueueEntry> {
    const stored = {
      id: randomUUID(),
      to: entry.to,
      subject: entry.subject,
      htmlBody: entry.htmlBody,
      template: entry.template,
      metadata: entry.metadata,
      createdAt: new Date(),
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
      scheduledAt: new Date(),
      error: null,
    };
    this.entries.push(stored);
    return {
      id: stored.id,
      to: stored.to,
      subject: stored.subject,
      htmlBody: stored.htmlBody,
      template: stored.template,
      metadata: stored.metadata,
      createdAt: stored.createdAt,
    };
  }

  async findRecentByRecipient(
    email: string,
    template: string,
    since: Date,
  ): Promise<EmailQueueEntry | null> {
    const sinceTime = since.getTime();
    // Return the most recent matching entry
    const candidates = this.entries
      .filter(
        (e) =>
          e.to === email &&
          e.template === template &&
          e.createdAt.getTime() >= sinceTime,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (candidates.length === 0) return null;
    const c = candidates[0];
    return {
      id: c.id,
      to: c.to,
      subject: c.subject,
      htmlBody: c.htmlBody,
      template: c.template,
      metadata: c.metadata,
      createdAt: c.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Worker operations
  // -------------------------------------------------------------------------

  async claimPending(
    now: Date,
    batchSize: number,
  ): Promise<EmailQueueWorkerEntry[]> {
    const nowTime = now.getTime();
    const claimed: EmailQueueWorkerEntry[] = [];
    let remaining = batchSize;
    for (const e of this.entries) {
      if (remaining <= 0) break;
      if (e.status === 'PENDING' && e.scheduledAt.getTime() <= nowTime) {
        e.status = 'PROCESSING';
        claimed.push({
          id: e.id,
          to: e.to,
          subject: e.subject,
          htmlBody: e.htmlBody,
          template: e.template,
          metadata: e.metadata,
          createdAt: e.createdAt,
          status: e.status,
          retryCount: e.retryCount,
          maxRetries: e.maxRetries,
          scheduledAt: e.scheduledAt,
        });
        remaining -= 1;
      }
    }
    return claimed;
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    const e = this.entries.find((x) => x.id === id);
    if (!e) return;
    e.status = 'SENT';
    e.sentAt = sentAt;
    e.error = null;
  }

  async markFailed(
    id: string,
    error: string,
    retryCount: number,
  ): Promise<void> {
    const e = this.entries.find((x) => x.id === id);
    if (!e) return;
    e.status = 'FAILED';
    e.error = error;
    e.retryCount = retryCount;
  }

  async reschedule(
    id: string,
    retryCount: number,
    scheduledAt: Date,
    error: string,
  ): Promise<void> {
    const e = this.entries.find((x) => x.id === id);
    if (!e) return;
    e.status = 'PENDING';
    e.retryCount = retryCount;
    e.scheduledAt = scheduledAt;
    e.error = error;
  }

  /** Test helper — inspect all stored entries (with worker state). */
  all(): EmailQueueEntry[] {
    return this.entries;
  }
}
