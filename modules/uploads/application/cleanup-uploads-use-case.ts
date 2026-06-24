import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';

const OLD_THRESHOLD_HOURS = 24;

export interface CleanupResult {
  deleted: number;
  errors: number;
}

export class CleanupUploadsUseCase {
  constructor(
    private readonly uploadRepo: UploadRepository,
    private readonly storage: StoragePort,
  ) {}

  async execute(): Promise<CleanupResult> {
    // 1. Find old pending uploads
    const oldPending =
      await this.uploadRepo.findPendingOlderThan(OLD_THRESHOLD_HOURS);

    let deleted = 0;
    let errors = 0;

    // 2. Process each upload (best-effort)
    for (const upload of oldPending) {
      try {
        // Delete from R2 first (best-effort, but we want to try before removing metadata)
        await this.storage.delete(upload.storageKey);
        // Remove metadata
        await this.uploadRepo.remove(upload.id);
        deleted++;
      } catch (err) {
        console.error(
          `[CleanupUploadsUseCase] Failed to clean up upload ${upload.id}:`,
          err,
        );
        // Still remove metadata even if R2 delete fails
        try {
          await this.uploadRepo.remove(upload.id);
        } catch {
          // If metadata removal also fails, count as error
        }
        errors++;
      }
    }

    return { deleted, errors };
  }
}
