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
    return this.txRunner.run(async () => {
      // 1. Find upload
      const upload = await this.uploadRepo.findById(id);
      if (!upload) {
        throw new NotFoundError('Upload not found');
      }

      // 2. Ownership check
      if (upload.uploadedBy !== userId && !isAdmin) {
        throw new AppError('Forbidden', 403, 'Forbidden');
      }

      // 3. Delete from R2 (best-effort — log error but continue)
      try {
        await this.storage.delete(upload.storageKey);
      } catch (err) {
        // R2 failure is non-blocking — metadata removal is mandatory
        console.error(
          `[DeleteUploadUseCase] R2 delete failed for key ${upload.storageKey}:`,
          err,
        );
      }

      // 4. Remove metadata from DB
      await this.uploadRepo.remove(id);

      // 5. Emit file.deleted event via outbox
      await this.outboxRepo.saveEvent(FILE_DELETED, {
        uploadId: upload.id,
        storageKey: upload.storageKey,
      });
    });
  }
}
