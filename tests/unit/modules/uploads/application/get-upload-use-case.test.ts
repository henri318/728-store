import { describe, it, expect, beforeEach } from 'vitest';
import { GetUploadUseCase } from '@/modules/uploads/application/get-upload-use-case';
import { MemoryUploadRepository } from '@/tests/doubles/memory-upload-repository';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';

function makeUpload(overrides: Partial<UploadEntity> = {}): UploadEntity {
  return {
    id: 'upload-1',
    fileName: 'photo.webp',
    storageKey: 'product/user-1/clsxyz123.webp',
    mimeType: 'image/webp',
    size: 102_400,
    uploadedBy: 'user-1',
    type: UploadType.product,
    status: UploadStatus.CONFIRMED,
    createdAt: new Date('2025-06-15T12:00:00Z'),
    ...overrides,
  };
}

describe('GetUploadUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let useCase: GetUploadUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    useCase = new GetUploadUseCase(uploadRepo);
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should return the upload entity by ID', async () => {
    const upload = makeUpload();
    await uploadRepo.save(upload);

    const result = await useCase.execute('upload-1');

    expect(result.id).toBe('upload-1');
    expect(result.fileName).toBe('photo.webp');
    expect(result.storageKey).toBe('product/user-1/clsxyz123.webp');
    expect(result.mimeType).toBe('image/webp');
    expect(result.size).toBe(102_400);
    expect(result.uploadedBy).toBe('user-1');
    expect(result.type).toBe(UploadType.product);
    expect(result.status).toBe(UploadStatus.CONFIRMED);
    expect(result.createdAt).toEqual(new Date('2025-06-15T12:00:00Z'));
  });

  it('should return PENDING uploads', async () => {
    await uploadRepo.save(makeUpload({ status: UploadStatus.PENDING }));

    const result = await useCase.execute('upload-1');

    expect(result.status).toBe(UploadStatus.PENDING);
  });

  // ── Ownership ───────────────────────────────────────────────

  it('should allow the owner to view their upload', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    const result = await useCase.execute('upload-1', 'user-1', false);

    expect(result.id).toBe('upload-1');
  });

  it('should allow admin to view any upload', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    const result = await useCase.execute('upload-1', 'admin-user', true);

    expect(result.id).toBe('upload-1');
  });

  it('should throw Forbidden when non-owner non-admin tries to view', async () => {
    await uploadRepo.save(makeUpload({ uploadedBy: 'user-1' }));

    await expect(useCase.execute('upload-1', 'user-2', false)).rejects.toThrow(
      'Forbidden',
    );
  });

  it('should allow viewing without auth (backwards compatible)', async () => {
    await uploadRepo.save(makeUpload());

    const result = await useCase.execute('upload-1');

    expect(result.id).toBe('upload-1');
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
});
