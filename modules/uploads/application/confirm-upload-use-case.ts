import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import { FILE_UPLOADED } from '@/modules/uploads/domain/upload-events';
import { NotFoundError, ConflictError } from '@/shared/kernel/app-error';

export interface ConfirmUploadResult {
  id: string;
  storageKey: string;
}

export class ConfirmUploadUseCase {
  constructor(
    private readonly uploadRepo: UploadRepository,
    private readonly outboxRepo: OutboxRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async execute(id: string): Promise<ConfirmUploadResult> {
    return this.txRunner.run(async () => {
      // 1. Find upload
      const upload = await this.uploadRepo.findById(id);
      if (!upload) {
        throw new NotFoundError('Upload not found');
      }

      // 2. Check if already confirmed
      if (upload.status === UploadStatus.CONFIRMED) {
        throw new ConflictError('Upload already confirmed');
      }

      // 3. Mark as CONFIRMED
      const confirmed = { ...upload, status: UploadStatus.CONFIRMED };
      await this.uploadRepo.save(confirmed);

      // 4. Emit file.uploaded event via outbox
      await this.outboxRepo.saveEvent(FILE_UPLOADED, {
        uploadId: upload.id,
        storageKey: upload.storageKey,
        uploadedBy: upload.uploadedBy,
        type: upload.type,
      });

      return { id: upload.id, storageKey: upload.storageKey };
    });
  }
}
