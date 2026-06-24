import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import { NotFoundError } from '@/shared/kernel/app-error';

const DEFAULT_EXPIRES = 3600; // 1 hour

export interface GenerateReadUrlResult {
  url: string;
  expiresAt: Date;
}

export class GenerateReadUrlUseCase {
  constructor(
    private readonly uploadRepo: UploadRepository,
    private readonly storage: StoragePort,
  ) {}

  async execute(id: string, expires?: number): Promise<GenerateReadUrlResult> {
    // 1. Find upload
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // 2. Generate presigned read URL
    const ttl = expires ?? DEFAULT_EXPIRES;
    const url = await this.storage.generateReadUrl(upload.storageKey, ttl);

    // 3. Calculate expiration time
    const expiresAt = new Date(Date.now() + ttl * 1000);

    return { url, expiresAt };
  }
}
