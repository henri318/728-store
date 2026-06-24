import { describe, it, expect, beforeEach } from 'vitest';
import { ConfirmUploadUseCase } from '@/modules/uploads/application/confirm-upload-use-case';
import { MemoryUploadRepository } from '@/tests/doubles/memory-upload-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryTransactionRunner } from '@/tests/doubles/memory-transaction-runner';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import { FILE_UPLOADED } from '@/modules/uploads/domain/upload-events';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';

function makePendingUpload(
  overrides: Partial<UploadEntity> = {},
): UploadEntity {
  return {
    id: 'upload-1',
    fileName: 'photo.webp',
    storageKey: 'product/user-1/clsxyz123.webp',
    mimeType: 'image/webp',
    size: 102400,
    uploadedBy: 'user-1',
    type: UploadType.product,
    status: UploadStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ConfirmUploadUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let outboxRepo: MemoryOutboxRepository;
  let txRunner: MemoryTransactionRunner;
  let useCase: ConfirmUploadUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    outboxRepo = new MemoryOutboxRepository();
    txRunner = new MemoryTransactionRunner();
    useCase = new ConfirmUploadUseCase(uploadRepo, outboxRepo, txRunner);
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should mark upload as CONFIRMED', async () => {
    await uploadRepo.save(makePendingUpload());

    await useCase.execute('upload-1');

    const saved = await uploadRepo.findById('upload-1');
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(UploadStatus.CONFIRMED);
  });

  it('should return id and storageKey', async () => {
    await uploadRepo.save(makePendingUpload());

    const result = await useCase.execute('upload-1');

    expect(result.id).toBe('upload-1');
    expect(result.storageKey).toBe('product/user-1/clsxyz123.webp');
  });

  it('should emit file.uploaded event via outbox', async () => {
    await uploadRepo.save(makePendingUpload());

    await useCase.execute('upload-1');

    expect(outboxRepo.events.length).toBe(1);
    expect(outboxRepo.events[0].eventType).toBe(FILE_UPLOADED);
    const payload = outboxRepo.events[0].payload as {
      uploadId: string;
      storageKey: string;
      uploadedBy: string;
      type: string;
    };
    expect(payload.uploadId).toBe('upload-1');
    expect(payload.storageKey).toBe('product/user-1/clsxyz123.webp');
    expect(payload.uploadedBy).toBe('user-1');
    expect(payload.type).toBe(UploadType.product);
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when upload does not exist', async () => {
    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      'Upload not found',
    );
  });

  it('should throw ConflictError when upload is already confirmed', async () => {
    await uploadRepo.save(
      makePendingUpload({ status: UploadStatus.CONFIRMED }),
    );

    await expect(useCase.execute('upload-1')).rejects.toThrow(
      'Upload already confirmed',
    );
  });

  it('should not emit event when upload is already confirmed', async () => {
    await uploadRepo.save(
      makePendingUpload({ status: UploadStatus.CONFIRMED }),
    );

    await useCase.execute('upload-1').catch(() => {});

    expect(outboxRepo.events.length).toBe(0);
  });
});
