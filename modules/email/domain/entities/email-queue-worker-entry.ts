import type { EmailQueueEntry } from './email-queue-entry';

/**
 * Extended entry shape consumed by the email worker.
 * Adds retry / scheduling fields to the base entry.
 */
export interface EmailQueueWorkerEntry extends EmailQueueEntry {
  status: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
}
