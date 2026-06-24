import { describe, it, expect, beforeEach } from 'vitest';
import { CreateUploadUseCase } from '@/modules/uploads/application/create-upload-use-case';
import { MemoryUploadRepository } from '@/tests/doubles/memory-upload-repository';
import { MemoryStorageAdapter } from '@/tests/doubles/memory-storage-adapter';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';

describe('CreateUploadUseCase', () => {
  let uploadRepo: MemoryUploadRepository;
  let storage: MemoryStorageAdapter;
  let useCase: CreateUploadUseCase;

  beforeEach(() => {
    uploadRepo = new MemoryUploadRepository();
    storage = new MemoryStorageAdapter();
    useCase = new CreateUploadUseCase(uploadRepo, storage);
  });

  // ── Happy Path ──────────────────────────────────────────────

  it('should create a PENDING upload and return presigned URL + storageKey + id', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.webp',
      mimeType: 'image/webp',
      size: 102400,
    });

    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.storageKey).toMatch(/^product\/user-1\/[\w-]+\.webp$/);
    expect(result.uploadUrl).toContain(result.storageKey);
  });

  it('should save the upload with PENDING status and all fields', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.webp',
      mimeType: 'image/webp',
      size: 102400,
    });

    const saved = await uploadRepo.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(UploadStatus.PENDING);
    expect(saved!.uploadedBy).toBe('user-1');
    expect(saved!.type).toBe(UploadType.product);
    expect(saved!.fileName).toBe('photo.webp');
    expect(saved!.mimeType).toBe('image/webp');
    expect(saved!.size).toBe(102400);
  });

  it('should generate a storageKey with the correct format', async () => {
    const result = await useCase.execute({
      userId: 'user-42',
      type: UploadType.avatar,
      fileName: 'avatar.png',
      mimeType: 'image/png',
      size: 51200,
    });

    expect(result.storageKey).toMatch(/^avatar\/user-42\/[\w-]+\.png$/);
  });

  it('should generate unique IDs for each upload', async () => {
    const r1 = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'a.webp',
      mimeType: 'image/webp',
      size: 100,
    });
    const r2 = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'b.webp',
      mimeType: 'image/webp',
      size: 200,
    });

    expect(r1.id).not.toBe(r2.id);
  });

  // ── MIME Validation ─────────────────────────────────────────

  it('should accept JPEG MIME type and return valid result', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });

    expect(result.storageKey).toContain('.jpg');
    const saved = await uploadRepo.findById(result.id);
    expect(saved!.mimeType).toBe('image/jpeg');
  });

  it('should accept PNG MIME type and return valid result', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
    });

    expect(result.storageKey).toContain('.png');
    const saved = await uploadRepo.findById(result.id);
    expect(saved!.mimeType).toBe('image/png');
  });

  it('should throw ValidationError for disallowed MIME type', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      }),
    ).rejects.toThrow('Invalid MIME type');
  });

  it('should throw ValidationError for SVG MIME type', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'icon.svg',
        mimeType: 'image/svg+xml',
        size: 1024,
      }),
    ).rejects.toThrow('Invalid MIME type');
  });

  it('should be case-insensitive for MIME type check', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.JPEG',
      mimeType: 'IMAGE/JPEG',
      size: 1024,
    });

    expect(result.storageKey).toContain('.JPEG');
  });

  // ── Size Validation ─────────────────────────────────────────

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  it('should accept files up to 10 MB', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'large.webp',
      mimeType: 'image/webp',
      size: MAX_SIZE,
    });

    const saved = await uploadRepo.findById(result.id);
    expect(saved!.size).toBe(MAX_SIZE);
  });

  it('should throw ValidationError for files exceeding 10 MB', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'huge.webp',
        mimeType: 'image/webp',
        size: MAX_SIZE + 1,
      }),
    ).rejects.toThrow('File too large');
  });

  it('should throw ValidationError for zero-size files', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'empty.webp',
        mimeType: 'image/webp',
        size: 0,
      }),
    ).rejects.toThrow('Invalid file size');
  });

  it('should throw ValidationError for negative size', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'bad.webp',
        mimeType: 'image/webp',
        size: -1,
      }),
    ).rejects.toThrow('Invalid file size');
  });

  // ── StorageKey Format ───────────────────────────────────────

  it('should include file extension from fileName in storageKey', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
    });

    expect(result.storageKey).toMatch(/\.png$/);
  });

  it('should use correct type prefix in storageKey', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.ticket,
      fileName: 'screenshot.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
    });

    expect(result.storageKey).toMatch(/^ticket\//);
  });

  // ── Edge Cases: fileName ────────────────────────────────────

  it('should throw ValidationError when fileName has no extension', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'photo',
        mimeType: 'image/webp',
        size: 1024,
      }),
    ).rejects.toThrow('Invalid file extension');
  });

  it('should throw ValidationError when fileName has disallowed extension', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'doc.pdf',
        mimeType: 'image/webp',
        size: 1024,
      }),
    ).rejects.toThrow('Invalid file extension');
  });

  it('should use last extension when fileName has multiple dots', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      type: UploadType.product,
      fileName: 'photo.backup.webp',
      mimeType: 'image/webp',
      size: 1024,
    });

    expect(result.storageKey).toMatch(/\.webp$/);
    expect(result.storageKey).not.toContain('backup');
  });

  // ── Edge Cases: storage failure ─────────────────────────────

  it('should propagate error when storage.generateUploadUrl fails', async () => {
    const failingStorage: MemoryStorageAdapter = Object.create(storage);
    failingStorage.generateUploadUrl = async () => {
      throw new Error('R2 connection timeout');
    };
    const failingUseCase = new CreateUploadUseCase(uploadRepo, failingStorage);

    let caughtError: Error | null = null;
    try {
      await failingUseCase.execute({
        userId: 'user-1',
        type: UploadType.product,
        fileName: 'photo.webp',
        mimeType: 'image/webp',
        size: 1024,
      });
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe('R2 connection timeout');

    // Upload was saved as PENDING before the storage call failed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = (uploadRepo as any).store.find(
      (u: { uploadedBy: string; status: string }) =>
        u.uploadedBy === 'user-1' && u.status === 'PENDING',
    );
    expect(saved).toBeDefined();
    expect(saved.mimeType).toBe('image/webp');
  });
});
