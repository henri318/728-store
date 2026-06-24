import { describe, it, expect, beforeEach } from 'vitest';
import { CleanupUploadsUseCase } from '@/modules/uploads/application/cleanup-uploads-use-case';
import { MemoryUploadRepository } from '@/tests/doubles/memory-upload-repository';
import { MemoryStorageAdapter } from '@/tests/doubles/memory-storage-adapter';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
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
    status: UploadStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('CleanupUploadsUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let storage: MemoryStorageAdapter;
  let useCase: CleanupUploadsUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    storage = new MemoryStorageAdapter();
    useCase = new CleanupUploadsUseCase(uploadRepo, storage);
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should delete old pending uploads and return count', async () => {
    // Create uploads older than 24 hours
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(makeUpload({ id: 'old-1', createdAt: oldDate }));
    await uploadRepo.save(makeUpload({ id: 'old-2', createdAt: oldDate }));

    const result = await useCase.execute();

    expect(result.deleted).toBe(2);
    expect(result.errors).toBe(0);
  });

  it('should remove old pending uploads from repository', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(makeUpload({ id: 'old-1', createdAt: oldDate }));

    await useCase.execute();

    const found = await uploadRepo.findById('old-1');
    expect(found).toBeNull();
  });

  it('should delete old pending uploads from R2 storage', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(
      makeUpload({
        id: 'old-1',
        storageKey: 'product/user-1/old1.webp',
        createdAt: oldDate,
      }),
    );

    await useCase.execute();

    expect(storage.deleted).toContain('product/user-1/old1.webp');
  });

  // ── Filtering Logic ─────────────────────────────────────────

  it('should not delete recent pending uploads (less than 24h old)', async () => {
    const recentDate = new Date(Date.now() - 1 * 3600_000); // 1 hour ago
    await uploadRepo.save(
      makeUpload({ id: 'recent-1', createdAt: recentDate }),
    );

    const result = await useCase.execute();

    expect(result.deleted).toBe(0);
    const found = await uploadRepo.findById('recent-1');
    expect(found).not.toBeNull();
  });

  it('should not delete confirmed uploads even if old', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(
      makeUpload({
        id: 'confirmed-1',
        status: UploadStatus.CONFIRMED,
        createdAt: oldDate,
      }),
    );

    const result = await useCase.execute();

    expect(result.deleted).toBe(0);
    const found = await uploadRepo.findById('confirmed-1');
    expect(found).not.toBeNull();
  });

  // ── Error Handling ──────────────────────────────────────────

  it('should handle R2 delete failures gracefully', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(makeUpload({ id: 'old-1', createdAt: oldDate }));

    // Make storage throw on delete
    const failingStorage: MemoryStorageAdapter = Object.create(storage);
    failingStorage.delete = async () => {
      throw new Error('R2 connection failed');
    };
    const failingUseCase = new CleanupUploadsUseCase(
      uploadRepo,
      failingStorage,
    );

    const result = await failingUseCase.execute();

    expect(result.deleted).toBe(0);
    expect(result.errors).toBe(1);
    // Metadata should still be removed
    const found = await uploadRepo.findById('old-1');
    expect(found).toBeNull();
  });

  it('should continue processing other uploads when one fails', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    await uploadRepo.save(makeUpload({ id: 'old-1', createdAt: oldDate }));
    await uploadRepo.save(makeUpload({ id: 'old-2', createdAt: oldDate }));

    // Make storage fail on first delete only
    let callCount = 0;
    const failingStorage: MemoryStorageAdapter = Object.create(storage);
    failingStorage.delete = async (key: string) => {
      callCount++;
      if (callCount === 1) throw new Error('R2 connection failed');
      storage.deleted.push(key);
    };
    const failingUseCase = new CleanupUploadsUseCase(
      uploadRepo,
      failingStorage,
    );

    const result = await failingUseCase.execute();

    expect(result.deleted).toBe(1);
    expect(result.errors).toBe(1);
  });

  // ── Edge Cases ──────────────────────────────────────────────

  it('should return zeros when no old pending uploads exist', async () => {
    const result = await useCase.execute();

    expect(result.deleted).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('should handle mixed old and new pending uploads', async () => {
    const oldDate = new Date(Date.now() - 25 * 3600_000);
    const recentDate = new Date(Date.now() - 1 * 3600_000);
    await uploadRepo.save(makeUpload({ id: 'old-1', createdAt: oldDate }));
    await uploadRepo.save(
      makeUpload({ id: 'recent-1', createdAt: recentDate }),
    );

    const result = await useCase.execute();

    expect(result.deleted).toBe(1);
    const foundOld = await uploadRepo.findById('old-1');
    expect(foundOld).toBeNull();
    const foundRecent = await uploadRepo.findById('recent-1');
    expect(foundRecent).not.toBeNull();
  });
});
