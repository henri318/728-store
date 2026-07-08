import type { EmailSender } from '@/modules/email/domain/email-sender';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';

export interface EmailQueueDrainOptions {
  batchSize?: number;
  now?: Date;
  source?: 'worker' | 'http' | 'inline';
}

export interface EmailQueueDrainResult {
  claimed: number;
  sent: number;
  sentButUnconfirmed: number;
  rescheduled: number;
  failed: number;
}

const DEFAULT_BATCH_SIZE = 10;
const STALE_PROCESSING_AFTER_MS = 15 * 60 * 1000;

function resolveBatchSize(batchSize?: number): number {
  if (
    typeof batchSize === 'number' &&
    Number.isSafeInteger(batchSize) &&
    batchSize > 0
  ) {
    return batchSize;
  }

  const envBatchSize = Number(
    process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE ?? DEFAULT_BATCH_SIZE,
  );
  return Number.isSafeInteger(envBatchSize) && envBatchSize > 0
    ? envBatchSize
    : DEFAULT_BATCH_SIZE;
}

export class EmailQueueDrainService {
  private inFlight: Promise<EmailQueueDrainResult> | null = null;

  constructor(
    private readonly queueRepository: EmailQueueRepository,
    private readonly emailSender: EmailSender,
  ) {}

  private async runDrain(
    options: EmailQueueDrainOptions,
  ): Promise<EmailQueueDrainResult> {
    const now = options.now ?? new Date();
    const batchSize = resolveBatchSize(options.batchSize);
    await this.queueRepository.recoverStaleProcessing(
      now,
      STALE_PROCESSING_AFTER_MS,
    );
    const claimed = await this.queueRepository.claimPending(now, batchSize);

    let sent = 0;
    let sentButUnconfirmed = 0;
    let rescheduled = 0;
    let failed = 0;

    for (const email of claimed) {
      try {
        await this.emailSender.send({
          to: email.to,
          subject: email.subject,
          htmlBody: email.htmlBody,
        });
      } catch (error) {
        const retryCount = email.retryCount + 1;
        if (retryCount >= email.maxRetries) {
          await this.queueRepository.markFailed(
            email.id,
            String(error),
            retryCount,
          );
          failed += 1;
          continue;
        }

        const backoffSeconds = Math.pow(2, retryCount) * 60;
        await this.queueRepository.reschedule(
          email.id,
          retryCount,
          new Date(now.getTime() + backoffSeconds * 1000),
          String(error),
        );
        rescheduled += 1;
        continue;
      }

      try {
        await this.queueRepository.markSent(email.id, new Date());
        sent += 1;
      } catch (error) {
        console.error('[EmailQueueDrainService] Failed to persist sent state', {
          emailId: email.id,
          error: String(error),
        });
        sentButUnconfirmed += 1;
      }
    }

    return {
      claimed: claimed.length,
      sent,
      sentButUnconfirmed,
      rescheduled,
      failed,
    };
  }

  drain(options: EmailQueueDrainOptions = {}): Promise<EmailQueueDrainResult> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        return await this.runDrain(options);
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }
}
