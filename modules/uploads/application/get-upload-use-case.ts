import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';
import { NotFoundError } from '@/shared/kernel/app-error';

export class GetUploadUseCase {
  constructor(private readonly uploadRepo: UploadRepository) {}

  async execute(id: string): Promise<UploadEntity> {
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }
    return upload;
  }
}
