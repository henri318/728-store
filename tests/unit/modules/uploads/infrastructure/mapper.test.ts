import { describe, it, expect } from 'vitest';
import {
  toDomainUpload,
  toPersistenceUpload,
  type PrismaUploadRow,
} from '@/modules/uploads/infrastructure/mapper';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';

/**
 * PR2 — Upload mapper pure functions.
 *
 * `toDomainUpload` converts a Prisma Upload row into a domain UploadEntity.
 * `toPersistenceUpload` converts a domain UploadEntity into a Prisma create input.
 *
 * Both functions are PURE — no I/O, no Prisma client dependency.
 * Round-trip tested: toPersistence(toDomain(row)) === row (scalar fields)
 */

// ─── Helpers ───
function makePrismaUploadRow(
  overrides: Partial<PrismaUploadRow> = {},
): PrismaUploadRow {
  return {
    id: 'upload-1',
    fileName: 'photo.webp',
    storageKey: 'product/user-1/clsxyz123.webp',
    mimeType: 'image/webp',
    size: 102400,
    uploadedBy: 'user-1',
    type: 'product',
    status: 'PENDING',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

function makeEntity(overrides: Partial<UploadEntity> = {}): UploadEntity {
  return {
    id: 'upload-1',
    fileName: 'photo.webp',
    storageKey: 'product/user-1/clsxyz123.webp',
    mimeType: 'image/webp',
    size: 102400,
    uploadedBy: 'user-1',
    type: UploadType.product,
    status: UploadStatus.PENDING,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

// ─── toDomainUpload ───
describe('mapper.toDomainUpload', () => {
  it('should map a Prisma Upload row to an UploadEntity with all fields', () => {
    const row = makePrismaUploadRow();
    const result = toDomainUpload(row);

    expect(result.id).toBe('upload-1');
    expect(result.fileName).toBe('photo.webp');
    expect(result.storageKey).toBe('product/user-1/clsxyz123.webp');
    expect(result.mimeType).toBe('image/webp');
    expect(result.size).toBe(102400);
    expect(result.uploadedBy).toBe('user-1');
    expect(result.type).toBe(UploadType.product);
    expect(result.status).toBe(UploadStatus.PENDING);
    expect(result.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));
  });

  it('should map CONFIRMED status correctly', () => {
    const row = makePrismaUploadRow({ status: 'CONFIRMED' });
    const result = toDomainUpload(row);
    expect(result.status).toBe(UploadStatus.CONFIRMED);
  });

  it('should map AVATAR type correctly', () => {
    const row = makePrismaUploadRow({ type: 'avatar' });
    const result = toDomainUpload(row);
    expect(result.type).toBe(UploadType.avatar);
  });

  it('should map TICKET type correctly', () => {
    const row = makePrismaUploadRow({ type: 'ticket' });
    const result = toDomainUpload(row);
    expect(result.type).toBe(UploadType.ticket);
  });

  it('should map GENERAL type correctly', () => {
    const row = makePrismaUploadRow({ type: 'general' });
    const result = toDomainUpload(row);
    expect(result.type).toBe(UploadType.general);
  });

  // ─── Edge cases: invalid enum values ───
  it('should pass through invalid type values (no runtime validation)', () => {
    // The mapper is a pure structural converter — enum validation happens at use-case boundaries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = makePrismaUploadRow({ type: 'invalid_type' as any });
    const result = toDomainUpload(row);
    expect(result.type).toBe('invalid_type');
  });

  it('should pass through invalid status values (no runtime validation)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = makePrismaUploadRow({ status: 'INVALID_STATUS' as any });
    const result = toDomainUpload(row);
    expect(result.status).toBe('INVALID_STATUS');
  });

  // ─── Edge cases: empty strings ───
  it('should handle empty string for fileName', () => {
    const row = makePrismaUploadRow({ fileName: '' });
    const result = toDomainUpload(row);
    expect(result.fileName).toBe('');
  });

  it('should handle empty string for storageKey', () => {
    const row = makePrismaUploadRow({ storageKey: '' });
    const result = toDomainUpload(row);
    expect(result.storageKey).toBe('');
  });

  it('should handle empty string for id', () => {
    const row = makePrismaUploadRow({ id: '' });
    const result = toDomainUpload(row);
    expect(result.id).toBe('');
  });

  it('should handle empty string for uploadedBy', () => {
    const row = makePrismaUploadRow({ uploadedBy: '' });
    const result = toDomainUpload(row);
    expect(result.uploadedBy).toBe('');
  });

  // ─── Edge cases: boundary values for size ───
  it('should handle zero size', () => {
    const row = makePrismaUploadRow({ size: 0 });
    const result = toDomainUpload(row);
    expect(result.size).toBe(0);
  });

  it('should handle very large size (Number.MAX_SAFE_INTEGER)', () => {
    const row = makePrismaUploadRow({ size: Number.MAX_SAFE_INTEGER });
    const result = toDomainUpload(row);
    expect(result.size).toBe(Number.MAX_SAFE_INTEGER);
  });

  // ─── Edge cases: date boundaries ───
  it('should handle epoch date', () => {
    const epoch = new Date(0);
    const row = makePrismaUploadRow({ createdAt: epoch });
    const result = toDomainUpload(row);
    expect(result.createdAt).toEqual(epoch);
  });

  it('should handle far future date', () => {
    const future = new Date('2099-12-31T23:59:59Z');
    const row = makePrismaUploadRow({ createdAt: future });
    const result = toDomainUpload(row);
    expect(result.createdAt).toEqual(future);
  });
});

// ─── toPersistenceUpload ───
describe('mapper.toPersistenceUpload', () => {
  it('should convert an UploadEntity to Prisma create input', () => {
    const entity = makeEntity();
    const result = toPersistenceUpload(entity);

    expect(result.id).toBe(entity.id);
    expect(result.fileName).toBe(entity.fileName);
    expect(result.storageKey).toBe(entity.storageKey);
    expect(result.mimeType).toBe(entity.mimeType);
    expect(result.size).toBe(entity.size);
    expect(result.uploadedBy).toBe(entity.uploadedBy);
    expect(result.type).toBe(entity.type);
    expect(result.status).toBe(entity.status);
    expect(result.createdAt).toBe(entity.createdAt);
  });

  it('should preserve all field values without transformation', () => {
    const entity = makeEntity({
      id: 'custom-id',
      fileName: 'custom-photo.png',
      storageKey: 'avatar/user-42/custom.webp',
      mimeType: 'image/png',
      size: 512000,
      uploadedBy: 'user-42',
      type: UploadType.avatar,
      status: UploadStatus.CONFIRMED,
      createdAt: new Date('2025-06-15T14:30:00Z'),
    });
    const result = toPersistenceUpload(entity);

    expect(result.id).toBe('custom-id');
    expect(result.fileName).toBe('custom-photo.png');
    expect(result.storageKey).toBe('avatar/user-42/custom.webp');
    expect(result.mimeType).toBe('image/png');
    expect(result.size).toBe(512000);
    expect(result.uploadedBy).toBe('user-42');
    expect(result.type).toBe(UploadType.avatar);
    expect(result.status).toBe(UploadStatus.CONFIRMED);
    expect(result.createdAt).toEqual(new Date('2025-06-15T14:30:00Z'));
  });

  // ─── Edge cases: invalid enum values ───
  it('should pass through invalid type values (no runtime validation)', () => {
    const entity = makeEntity({ type: 'bad_type' as UploadType });
    const result = toPersistenceUpload(entity);
    expect(result.type).toBe('bad_type');
  });

  it('should pass through invalid status values (no runtime validation)', () => {
    const entity = makeEntity({ status: 'BAD_STATUS' as UploadStatus });
    const result = toPersistenceUpload(entity);
    expect(result.status).toBe('BAD_STATUS');
  });

  // ─── Edge cases: empty strings ───
  it('should handle empty string for fileName', () => {
    const entity = makeEntity({ fileName: '' });
    const result = toPersistenceUpload(entity);
    expect(result.fileName).toBe('');
  });

  it('should handle empty string for storageKey', () => {
    const entity = makeEntity({ storageKey: '' });
    const result = toPersistenceUpload(entity);
    expect(result.storageKey).toBe('');
  });

  // ─── Edge cases: boundary values for size ───
  it('should handle zero size', () => {
    const entity = makeEntity({ size: 0 });
    const result = toPersistenceUpload(entity);
    expect(result.size).toBe(0);
  });

  it('should handle very large size', () => {
    const entity = makeEntity({ size: Number.MAX_SAFE_INTEGER });
    const result = toPersistenceUpload(entity);
    expect(result.size).toBe(Number.MAX_SAFE_INTEGER);
  });

  // ─── Edge cases: date boundaries ───
  it('should handle epoch date', () => {
    const entity = makeEntity({ createdAt: new Date(0) });
    const result = toPersistenceUpload(entity);
    expect(result.createdAt).toEqual(new Date(0));
  });

  it('should handle far future date', () => {
    const future = new Date('2099-12-31T23:59:59Z');
    const entity = makeEntity({ createdAt: future });
    const result = toPersistenceUpload(entity);
    expect(result.createdAt).toEqual(future);
  });
});

// ─── Round-trip tests ───
describe('mapper round-trip', () => {
  it('should preserve all scalar fields through toDomain → toPersistence', () => {
    const original: UploadEntity = {
      id: 'upload-roundtrip',
      fileName: 'photo.jpg',
      storageKey: 'product/user-1/clsxyz123.jpg',
      mimeType: 'image/jpeg',
      size: 102400,
      uploadedBy: 'user-1',
      type: UploadType.product,
      status: UploadStatus.CONFIRMED,
      createdAt: new Date('2025-06-15T12:00:00Z'),
    };

    const persistence = toPersistenceUpload(original);
    const row = makePrismaUploadRow(
      persistence as unknown as Partial<PrismaUploadRow>,
    );
    const domain = toDomainUpload(row);

    expect(domain.id).toBe(original.id);
    expect(domain.fileName).toBe(original.fileName);
    expect(domain.storageKey).toBe(original.storageKey);
    expect(domain.mimeType).toBe(original.mimeType);
    expect(domain.size).toBe(original.size);
    expect(domain.uploadedBy).toBe(original.uploadedBy);
    expect(domain.type).toBe(original.type);
    expect(domain.status).toBe(original.status);
    expect(domain.createdAt).toEqual(original.createdAt);
  });

  it('should handle PENDING status in round trip', () => {
    const original: UploadEntity = {
      id: 'upload-pending',
      fileName: 'product.webp',
      storageKey: 'product/user-3/clsdef789.webp',
      mimeType: 'image/webp',
      size: 204800,
      uploadedBy: 'user-3',
      type: UploadType.product,
      status: UploadStatus.PENDING,
      createdAt: new Date('2025-03-10T08:30:00Z'),
    };

    const persistence = toPersistenceUpload(original);
    const row = makePrismaUploadRow(
      persistence as unknown as Partial<PrismaUploadRow>,
    );
    const domain = toDomainUpload(row);

    expect(domain.status).toBe(UploadStatus.PENDING);
    expect(domain.type).toBe(UploadType.product);
  });

  it('should handle GENERAL type in round trip', () => {
    // Fixed: fileName now matches mimeType (image/jpeg → photo.jpg, not doc.pdf)
    const original: UploadEntity = {
      id: 'upload-general',
      fileName: 'photo.jpg',
      storageKey: 'general/user-4/clghi012.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      uploadedBy: 'user-4',
      type: UploadType.general,
      status: UploadStatus.CONFIRMED,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    const persistence = toPersistenceUpload(original);
    const row = makePrismaUploadRow(
      persistence as unknown as Partial<PrismaUploadRow>,
    );
    const domain = toDomainUpload(row);

    expect(domain.type).toBe(UploadType.general);
    expect(domain.size).toBe(1024);
  });
});
