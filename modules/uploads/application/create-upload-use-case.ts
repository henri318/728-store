import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import {
  isAllowedMimeType,
  isAllowedExtension,
} from '@/modules/uploads/domain/value-objects/mime-type';
import { ValidationError } from '@/shared/kernel/app-error';
import { randomUUID } from 'node:crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PRIVATE_READ_TTL = 7 * 24 * 3600; // 7 days — presigned URL for private buckets

/** Upload types whose assets are publicly accessible with a permanent URL. */
const PUBLIC_TYPES: readonly UploadType[] = [UploadType.product];

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
  readUrl: string;
  publicUrl: string;
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
    const ext = input.fileName.split('.').pop()!.toLowerCase();
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

    const isPublicType = (PUBLIC_TYPES as readonly UploadType[]).includes(
      input.type,
    );

    const [uploadUrl, readUrl] = await Promise.all([
      this.storage.generateUploadUrl(storageKey, input.mimeType),
      this.storage.generateReadUrl(storageKey),
    ]);

    // Public items get a permanent public URL; private items get a
    // long-lived presigned URL since the private bucket has no public domain.
    const publicUrl = isPublicType
      ? this.storage.getPublicUrl(storageKey)
      : await this.storage.generateReadUrl(storageKey, PRIVATE_READ_TTL);

    return { id, uploadUrl, storageKey, readUrl, publicUrl };
  }
}
