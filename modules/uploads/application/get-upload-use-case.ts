import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';
import { NotFoundError, AppError } from '@/shared/kernel/app-error';

export class GetUploadUseCase {
  constructor(private readonly uploadRepo: UploadRepository) {}

  async execute(
    id: string,
    userId?: string,
    isAdmin?: boolean,
  ): Promise<UploadEntity> {
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // Ownership check
    if (userId && upload.uploadedBy !== userId && !isAdmin) {
      throw new AppError('Forbidden', 403, 'Forbidden');
    }

    return upload;
  }
}
