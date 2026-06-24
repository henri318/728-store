import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { FILE_DELETED } from '@/modules/uploads/domain/upload-events';
import { NotFoundError, AppError } from '@/shared/kernel/app-error';

export class DeleteUploadUseCase {
  constructor(
    private readonly uploadRepo: UploadRepository,
    private readonly storage: StoragePort,
    private readonly outboxRepo: OutboxRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async execute(id: string, userId: string, isAdmin: boolean): Promise<void> {
    // 1. Find upload (outside tx — read-only, no mutation risk)
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // 2. Ownership check
    if (upload.uploadedBy !== userId && !isAdmin) {
      throw new AppError('Forbidden', 403, 'Forbidden');
    }

    // 3. DB transaction: remove metadata + emit event
    await this.txRunner.run(async () => {
      await this.uploadRepo.remove(id);
      await this.outboxRepo.saveEvent(FILE_DELETED, {
        uploadId: upload.id,
        storageKey: upload.storageKey,
      });
    });

    // 4. Delete from R2 AFTER transaction succeeds (best-effort)
    try {
      await this.storage.delete(upload.storageKey);
    } catch (err) {
      console.error(
        `[DeleteUploadUseCase] R2 delete failed for key ${upload.storageKey}:`,
        err,
      );
    }
  }
}
