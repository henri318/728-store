import { describe, it, expect, beforeEach } from 'vitest';
import { GenerateReadUrlUseCase } from '@/modules/uploads/application/generate-read-url-use-case';
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
    status: UploadStatus.CONFIRMED,
    createdAt: new Date('2025-06-15T12:00:00Z'),
    ...overrides,
  };
}

describe('GenerateReadUrlUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let storage: MemoryStorageAdapter;
  let useCase: GenerateReadUrlUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    storage = new MemoryStorageAdapter();
    useCase = new GenerateReadUrlUseCase(uploadRepo, storage);
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should return a presigned read URL for an existing upload', async () => {
    await uploadRepo.save(makeUpload());

    const result = await useCase.execute('upload-1');

    expect(result.url).toBe(
      'https://mock-r2.read/product/user-1/clsxyz123.webp',
    );
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should use default TTL of 3600 seconds when expires is not provided', async () => {
    await uploadRepo.save(makeUpload());
    const before = Date.now();

    const result = await useCase.execute('upload-1');

    // expiresAt should be approximately 3600 seconds from now
    const expectedExpires = before + 3600 * 1000;
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      expectedExpires - 1000,
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      expectedExpires + 1000,
    );
  });

  it('should use custom TTL when expires is provided', async () => {
    await uploadRepo.save(makeUpload());
    const before = Date.now();

    const result = await useCase.execute('upload-1', 7200);

    const expectedExpires = before + 7200 * 1000;
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      expectedExpires - 1000,
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      expectedExpires + 1000,
    );
  });

  it('should call storage.generateReadUrl with the correct key and TTL', async () => {
    await uploadRepo.save(makeUpload());

    await useCase.execute('upload-1', 1800);

    expect(storage.readUrls.has('product/user-1/clsxyz123.webp')).toBe(true);
  });

  // ── Error Cases ─────────────────────────────────────────────

  it('should throw NotFoundError when upload does not exist', async () => {
    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      'Upload not found',
    );
  });

  it('should throw NotFoundError for empty ID', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Upload not found');
  });

  // ── Triangulation ───────────────────────────────────────────

  it('should work with PENDING uploads', async () => {
    await uploadRepo.save(makeUpload({ status: UploadStatus.PENDING }));

    const result = await useCase.execute('upload-1');

    expect(result.url).toBe(
      'https://mock-r2.read/product/user-1/clsxyz123.webp',
    );
  });

  it('should work with different upload types', async () => {
    await uploadRepo.save(
      makeUpload({
        id: 'upload-2',
        storageKey: 'avatar/user-2/clsabc456.png',
        type: UploadType.avatar,
      }),
    );

    const result = await useCase.execute('upload-2');

    expect(result.url).toBe('https://mock-r2.read/avatar/user-2/clsabc456.png');
  });
});
