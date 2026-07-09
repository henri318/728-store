import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailSender } from '@/modules/email/domain/email-sender';
import type {
  EmailQueueRepository,
  EmailQueueWorkerEntry,
} from '@/shared/contracts/email/email-queue-port';
import { EmailQueueDrainService } from '@/modules/email/application/email-queue-drain-service';

function createWorkerEntry(
  overrides: Partial<EmailQueueWorkerEntry> = {},
): EmailQueueWorkerEntry {
  return {
    id: 'email-1',
    to: 'buyer@test.com',
    subject: 'Subject',
    htmlBody: '<p>Hi</p>',
    template: 'order-placed',
    metadata: undefined,
    idempotencyKey: 'order-placed:buyer@test.com:order-1',
    createdAt: new Date('2026-07-08T10:00:00.000Z'),
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: new Date('2026-07-08T10:00:00.000Z'),
    ...overrides,
  };
}

describe('EmailQueueDrainService', () => {
  let queueRepository: EmailQueueRepository;
  let emailSender: EmailSender;
  const ORIGINAL_BATCH_SIZE = process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE;

  function restoreBatchSizeEnv(): void {
    if (ORIGINAL_BATCH_SIZE === undefined) {
      delete process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE;
      return;
    }

    process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE = ORIGINAL_BATCH_SIZE;
  }

  beforeEach(() => {
    restoreBatchSizeEnv();

    queueRepository = {
      create: vi.fn(),
      findRecentByRecipient: vi.fn(),
      recoverStaleProcessing: vi.fn(),
      claimPending: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
      reschedule: vi.fn(),
    } satisfies EmailQueueRepository;

    emailSender = {
      send: vi.fn(),
    } satisfies EmailSender;
  });

  afterEach(() => {
    restoreBatchSizeEnv();
  });

  it('uses EMAIL_QUEUE_DRAIN_BATCH_SIZE when draining', async () => {
    process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE = '7';
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry(),
    ]);
    vi.mocked(emailSender.send).mockResolvedValue(undefined);

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(queueRepository.claimPending).toHaveBeenCalledWith(
      new Date('2026-07-08T10:05:00.000Z'),
      7,
    );
    expect(result).toEqual({
      claimed: 1,
      sent: 1,
      sentButUnconfirmed: 0,
      rescheduled: 0,
      failed: 0,
    });
  });

  it('falls back to the default batch size when EMAIL_QUEUE_DRAIN_BATCH_SIZE is invalid', async () => {
    process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE = 'not-a-number';
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry(),
    ]);
    vi.mocked(emailSender.send).mockResolvedValue(undefined);

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(queueRepository.claimPending).toHaveBeenCalledWith(
      new Date('2026-07-08T10:05:00.000Z'),
      10,
    );
    expect(result).toEqual({
      claimed: 1,
      sent: 1,
      sentButUnconfirmed: 0,
      rescheduled: 0,
      failed: 0,
    });
  });

  it('drains a batch and marks successful sends as sent using the default batch size', async () => {
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry(),
    ]);
    vi.mocked(emailSender.send).mockResolvedValue(undefined);

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(queueRepository.recoverStaleProcessing).toHaveBeenCalledWith(
      new Date('2026-07-08T10:05:00.000Z'),
      15 * 60 * 1000,
    );
    expect(queueRepository.claimPending).toHaveBeenCalledWith(
      new Date('2026-07-08T10:05:00.000Z'),
      10,
    );
    expect(emailSender.send).toHaveBeenCalledWith({
      to: 'buyer@test.com',
      subject: 'Subject',
      htmlBody: '<p>Hi</p>',
    });
    expect(queueRepository.markSent).toHaveBeenCalledWith(
      'email-1',
      expect.any(Date),
    );
    expect(result).toEqual({
      claimed: 1,
      sent: 1,
      sentButUnconfirmed: 0,
      rescheduled: 0,
      failed: 0,
    });
  });

  it('returns zero counters when the queue is empty', async () => {
    vi.mocked(queueRepository.claimPending).mockResolvedValue([]);

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(result).toEqual({
      claimed: 0,
      sent: 0,
      sentButUnconfirmed: 0,
      rescheduled: 0,
      failed: 0,
    });
  });

  it('reschedules failed sends with exponential backoff when retries remain', async () => {
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry({ retryCount: 0, maxRetries: 3 }),
    ]);
    vi.mocked(emailSender.send).mockRejectedValue(
      new Error('temporary outage'),
    );

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const now = new Date('2026-07-08T10:05:00.000Z');
    const result = await service.drain({ batchSize: 4, now });

    expect(queueRepository.claimPending).toHaveBeenCalledWith(now, 4);
    expect(queueRepository.reschedule).toHaveBeenCalledWith(
      'email-1',
      1,
      new Date('2026-07-08T10:07:00.000Z'),
      'Error: temporary outage',
    );
    expect(queueRepository.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      sentButUnconfirmed: 0,
      rescheduled: 1,
      failed: 0,
    });
  });

  it('marks failed sends as failed when the retry budget is exhausted', async () => {
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry({ retryCount: 2, maxRetries: 3 }),
    ]);
    vi.mocked(emailSender.send).mockRejectedValue(
      new Error('permanent outage'),
    );

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      batchSize: 2,
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(queueRepository.markFailed).toHaveBeenCalledWith(
      'email-1',
      'Error: permanent outage',
      3,
    );
    expect(queueRepository.reschedule).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      sentButUnconfirmed: 0,
      rescheduled: 0,
      failed: 1,
    });
  });

  it('counts a successful send as unconfirmed when markSent fails', async () => {
    vi.mocked(queueRepository.claimPending).mockResolvedValue([
      createWorkerEntry(),
    ]);
    vi.mocked(emailSender.send).mockResolvedValue(undefined);
    vi.mocked(queueRepository.markSent).mockRejectedValue(
      new Error('database unavailable'),
    );

    const service = new EmailQueueDrainService(queueRepository, emailSender);
    const result = await service.drain({
      now: new Date('2026-07-08T10:05:00.000Z'),
    });

    expect(queueRepository.markSent).toHaveBeenCalledWith(
      'email-1',
      expect.any(Date),
    );
    expect(queueRepository.reschedule).not.toHaveBeenCalled();
    expect(queueRepository.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      sentButUnconfirmed: 1,
      rescheduled: 0,
      failed: 0,
    });
  });
});
