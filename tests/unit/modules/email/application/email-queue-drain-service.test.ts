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
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EMAIL_QUEUE_DRAIN_BATCH_SIZE;

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
    process.env = ORIGINAL_ENV;
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
    expect(result).toEqual({ claimed: 1, sent: 1, rescheduled: 0, failed: 0 });
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
    expect(result).toEqual({ claimed: 1, sent: 0, rescheduled: 1, failed: 0 });
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
    expect(result).toEqual({ claimed: 1, sent: 0, rescheduled: 0, failed: 1 });
  });
});
