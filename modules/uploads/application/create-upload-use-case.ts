import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import {
  isAllowedMimeType,
  isAllowedExtension,
} from '@/modules/uploads/domain/value-objects/mime-type';
import { ValidationError } from '@/shared/kernel/app-error';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface CreateUploadInput {
  userId: string;
  type: UploadType;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface CreateUploadResult {
  id: string;
  uploadUrl: string;
  storageKey: string;
}

export class CreateUploadUseCase {
  constructor(
    private readonly uploadRepo: UploadRepository,
    private readonly storage: StoragePort,
  ) {}

  async execute(input: CreateUploadInput): Promise<CreateUploadResult> {
    // 1. Validate MIME type
    if (!isAllowedMimeType(input.mimeType)) {
      throw new ValidationError(
        `Invalid MIME type: ${input.mimeType}`,
        'Invalid MIME type',
      );
    }

    // 2. Validate file extension
    if (!isAllowedExtension(input.fileName)) {
      throw new ValidationError(
        `Invalid file extension: ${input.fileName}`,
        'Invalid file extension',
      );
    }

    // 3. Validate file size
    if (input.size <= 0) {
      throw new ValidationError(
        `Invalid file size: ${input.size}`,
        'Invalid file size',
      );
    }
    if (input.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File too large: ${input.size} bytes (max ${MAX_FILE_SIZE})`,
        'File too large',
      );
    }

    // 4. Generate unique ID and storage key
    const id = randomUUID();
    const ext = input.fileName.split('.').pop() || 'bin';
    const storageKey = `${input.type}/${input.userId}/${id}.${ext}`;

    // 5. Save upload as PENDING
    const upload = {
      id,
      fileName: input.fileName,
      storageKey,
      mimeType: input.mimeType,
      size: input.size,
      uploadedBy: input.userId,
      type: input.type,
      status: UploadStatus.PENDING,
      createdAt: new Date(),
    };
    await this.uploadRepo.save(upload);

    // 6. Generate presigned upload URL
    const uploadUrl = await this.storage.generateUploadUrl(
      storageKey,
      input.mimeType,
    );

    return { id, uploadUrl, storageKey };
  }
}
