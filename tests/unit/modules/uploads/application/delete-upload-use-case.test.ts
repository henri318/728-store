import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteUploadUseCase } from '@/modules/uploads/application/delete-upload-use-case';
import { MemoryUploadRepository } from '@/tests/doubles/memory-upload-repository';
import { MemoryStorageAdapter } from '@/tests/doubles/memory-storage-adapter';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryTransactionRunner } from '@/tests/doubles/memory-transaction-runner';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import { FILE_DELETED } from '@/modules/uploads/domain/upload-events';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';

function makeUpload(overrides: Partial<UploadEntity> = {}): UploadEntity {
  return {
    id: 'upload-1',
    fileName: 'photo.webp',
    storageKey: 'product/user-1/clsxyz123.webp',
    mimeType: 'image/webp',
    size: 102400,
    uploadedBy: 'user-1',
    type: UploadType.product,
    status: UploadStatus.CONFIRMED,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('DeleteUploadUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let storage: MemoryStorageAdapter;
  let outboxRepo: MemoryOutboxRepository;
  let txRunner: MemoryTransactionRunner;
  let useCase: DeleteUploadUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    storage = new MemoryStorageAdapter();
    outboxRepo = new MemoryOutboxRepository();
    txRunner = new MemoryTransactionRunner();
    useCase = new DeleteUploadUseCase(
      uploadRepo,
      storage,
      outboxRepo,
      txRunner,
    );
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should delete the upload metadata from the repository', async () => {
    await uploadRepo.save(makeUpload());

    await useCase.execute('upload-1', 'user-1', false);

    const found = await uploadRepo.findById('upload-1');
    expect(found).toBeNull();
  });

  it('should delete the file from R2 storage', async () => {
    await uploadRepo.save(makeUpload());

    await useCase.execute('upload-1', 'user-1', false);

    expect(storage.deleted).toContain('product/user-1/clsxyz123.webp');
  });

  it('should emit file.deleted event via outbox', async () => {
    await uploadRepo.save(makeUpload());

    await useCase.execute('upload-1', 'user-1', false);

    expect(outboxRepo.events.length).toBe(1);
    expect(outboxRepo.events[0].eventType).toBe(FILE_DELETED);
    const payload = outboxRepo.events[0].payload as {
      uploadId: string;
      storageKey: string;
    };
    expect(payload.uploadId).toBe('upload-1');
    expect(payload.storageKey).toBe('product/user-1/clsxyz123.webp');
  });

  // ── Ownership ───────────────────────────────────────────────

  it('should allow the owner to delete their upload', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    await useCase.execute('upload-1', 'user-1', false);

    const found = await uploadRepo.findById('upload-1');
    expect(found).toBeNull();
  });

  it('should allow admin to delete any upload', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    await useCase.execute('upload-1', 'admin-user', true);

    const found = await uploadRepo.findById('upload-1');
    expect(found).toBeNull();
  });

  it('should throw Forbidden when non-owner non-admin tries to delete', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    await expect(useCase.execute('upload-1', 'user-2', false)).rejects.toThrow(
      'Forbidden',
    );
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when upload does not exist', async () => {
    await expect(
      useCase.execute('nonexistent', 'user-1', false),
    ).rejects.toThrow('Upload not found');
  });

  it('should still delete metadata even if R2 delete fails', async () => {
    // Make storage throw on delete
    const failingStorage: MemoryStorageAdapter = Object.create(storage);
    failingStorage.delete = async () => {
      throw new Error('R2 connection failed');
    };
    const failingUseCase = new DeleteUploadUseCase(
      uploadRepo,
      failingStorage,
      outboxRepo,
      txRunner,
    );

    await uploadRepo.save(makeUpload());

    // Should not throw — R2 failure is logged but metadata is still removed
    await failingUseCase.execute('upload-1', 'user-1', false);

    const found = await uploadRepo.findById('upload-1');
    expect(found).toBeNull();
  });

  it('should emit file.deleted even if R2 delete fails', async () => {
    const failingStorage: MemoryStorageAdapter = Object.create(storage);
    failingStorage.delete = async () => {
      throw new Error('R2 connection failed');
    };
    const failingUseCase = new DeleteUploadUseCase(
      uploadRepo,
      failingStorage,
      outboxRepo,
      txRunner,
    );

    await uploadRepo.save(makeUpload());

    await failingUseCase.execute('upload-1', 'user-1', false);

    expect(outboxRepo.events.length).toBe(1);
    expect(outboxRepo.events[0].eventType).toBe(FILE_DELETED);
  });
});
