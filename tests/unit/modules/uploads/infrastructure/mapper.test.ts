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
  it('should map all fields from Prisma row to domain entity', () => {
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

  it('should map CONFIRMED status and all UploadType variants', () => {
    const confirmed = toDomainUpload(
      makePrismaUploadRow({ status: 'CONFIRMED' }),
    );
    expect(confirmed.status).toBe(UploadStatus.CONFIRMED);

    const avatar = toDomainUpload(makePrismaUploadRow({ type: 'avatar' }));
    expect(avatar.type).toBe(UploadType.avatar);

    const ticket = toDomainUpload(makePrismaUploadRow({ type: 'ticket' }));
    expect(ticket.type).toBe(UploadType.ticket);

    const general = toDomainUpload(makePrismaUploadRow({ type: 'general' }));
    expect(general.type).toBe(UploadType.general);
  });

  it('should pass through invalid enum values (no runtime validation)', () => {
    const row = makePrismaUploadRow({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'invalid_type' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: 'INVALID' as any,
    });
    const result = toDomainUpload(row);
    expect(result.type).toBe('invalid_type');
    expect(result.status).toBe('INVALID');
  });

  it('should handle empty strings and zero size', () => {
    const row = makePrismaUploadRow({
      id: '',
      fileName: '',
      storageKey: '',
      size: 0,
    });
    const result = toDomainUpload(row);
    expect(result.id).toBe('');
    expect(result.fileName).toBe('');
    expect(result.storageKey).toBe('');
    expect(result.size).toBe(0);
  });

  it('should handle epoch and far-future dates', () => {
    const epoch = toDomainUpload(
      makePrismaUploadRow({ createdAt: new Date(0) }),
    );
    expect(epoch.createdAt).toEqual(new Date(0));

    const future = toDomainUpload(
      makePrismaUploadRow({ createdAt: new Date('2099-12-31T23:59:59Z') }),
    );
    expect(future.createdAt).toEqual(new Date('2099-12-31T23:59:59Z'));
  });
});

// ─── toPersistenceUpload ───
describe('mapper.toPersistenceUpload', () => {
  it('should convert all fields from domain entity to Prisma create input', () => {
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

  it('should preserve non-default values (CONFIRMED, avatar, custom fields)', () => {
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
    expect(result.type).toBe(UploadType.avatar);
    expect(result.status).toBe(UploadStatus.CONFIRMED);
    expect(result.size).toBe(512000);
  });

  it('should pass through invalid enum values (no runtime validation)', () => {
    const entity = makeEntity({
      type: 'bad_type' as UploadType,
      status: 'BAD_STATUS' as UploadStatus,
    });
    const result = toPersistenceUpload(entity);
    expect(result.type).toBe('bad_type');
    expect(result.status).toBe('BAD_STATUS');
  });

  it('should handle empty strings and zero size', () => {
    const entity = makeEntity({ fileName: '', storageKey: '', size: 0 });
    const result = toPersistenceUpload(entity);
    expect(result.fileName).toBe('');
    expect(result.storageKey).toBe('');
    expect(result.size).toBe(0);
  });
});

// ─── Round-trip ───
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
});
