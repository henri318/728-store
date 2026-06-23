import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaUploadRepository } from '@/modules/uploads/infrastructure/prisma-upload-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import { UploadStatus } from '@/modules/uploads/domain/value-objects/upload-status';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import type { UploadEntity } from '@/modules/uploads/domain/entities/upload';

/**
 * PR2 — PrismaUploadRepository integration tests against real Docker PostgreSQL.
 *
 * Verifies CRUD operations and the orphan cleanup query through the actual
 * Prisma adapter (no mocks).
 */
describe('PrismaUploadRepository — Integration', () => {
  let repo: PrismaUploadRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaUploadRepository();
  });

  beforeEach(async () => {
    // Clean Upload table before each test
    await prisma.upload.deleteMany();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  function makeUpload(overrides: Partial<UploadEntity> = {}): UploadEntity {
    return {
      id: 'upload-int-1',
      fileName: 'photo.webp',
      storageKey: 'product/user-1/clsxyz123.webp',
      mimeType: 'image/webp',
      size: 102400,
      uploadedBy: 'user-1',
      type: UploadType.PRODUCT,
      status: UploadStatus.PENDING,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  // ─── save + findById ───
  describe('save + findById', () => {
    it('should persist and retrieve an upload by ID', async () => {
      const entity = makeUpload();
      await repo.save(entity);

      const found = await repo.findById('upload-int-1');

      expect(found).not.toBeNull();
      expect(found!.id).toBe('upload-int-1');
      expect(found!.fileName).toBe('photo.webp');
      expect(found!.storageKey).toBe('product/user-1/clsxyz123.webp');
      expect(found!.mimeType).toBe('image/webp');
      expect(found!.size).toBe(102400);
      expect(found!.uploadedBy).toBe('user-1');
      expect(found!.type).toBe(UploadType.PRODUCT);
      expect(found!.status).toBe(UploadStatus.PENDING);
      expect(found!.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));
    });

    it('should upsert when saving an existing ID', async () => {
      const entity = makeUpload();
      await repo.save(entity);

      // Update status to CONFIRMED
      const updated = makeUpload({ status: UploadStatus.CONFIRMED });
      await repo.save(updated);

      const found = await repo.findById('upload-int-1');
      expect(found).not.toBeNull();
      expect(found!.status).toBe(UploadStatus.CONFIRMED);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should persist all upload types', async () => {
      const types = [
        UploadType.PRODUCT,
        UploadType.AVATAR,
        UploadType.TICKET,
        UploadType.GENERAL,
      ];

      for (const type of types) {
        const entity = makeUpload({
          id: `upload-${type}`,
          type,
          storageKey: `${type}/user-1/cls${type}.webp`,
        });
        await repo.save(entity);
      }

      for (const type of types) {
        const found = await repo.findById(`upload-${type}`);
        expect(found).not.toBeNull();
        expect(found!.type).toBe(type);
      }
    });
  });

  // ─── remove ───
  describe('remove', () => {
    it('should delete an upload by ID', async () => {
      const entity = makeUpload();
      await repo.save(entity);

      await repo.remove('upload-int-1');

      const found = await repo.findById('upload-int-1');
      expect(found).toBeNull();
    });

    it('should not throw when removing non-existent ID', async () => {
      // Should complete without error
      await repo.remove('non-existent');
    });

    it('should only remove the specified upload', async () => {
      const entity1 = makeUpload({ id: 'upload-1', storageKey: 'key1' });
      const entity2 = makeUpload({ id: 'upload-2', storageKey: 'key2' });
      await repo.save(entity1);
      await repo.save(entity2);

      await repo.remove('upload-1');

      const found1 = await repo.findById('upload-1');
      const found2 = await repo.findById('upload-2');
      expect(found1).toBeNull();
      expect(found2).not.toBeNull();
    });
  });

  // ─── findPendingOlderThan ───
  describe('findPendingOlderThan', () => {
    it('should return PENDING uploads older than the given hours', async () => {
      // Create an upload with createdAt 25 hours ago
      const oldDate = new Date(Date.now() - 25 * 3600_000);
      const oldEntity = makeUpload({
        id: 'upload-old',
        storageKey: 'product/user-1/old.webp',
        status: UploadStatus.PENDING,
        createdAt: oldDate,
      });
      await repo.save(oldEntity);

      const results = await repo.findPendingOlderThan(24);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.find((u) => u.id === 'upload-old')).toBeDefined();
    });

    it('should not return CONFIRMED uploads even if old enough', async () => {
      const oldDate = new Date(Date.now() - 25 * 3600_000);
      const confirmedEntity = makeUpload({
        id: 'upload-confirmed-old',
        storageKey: 'product/user-1/confirmed-old.webp',
        status: UploadStatus.CONFIRMED,
        createdAt: oldDate,
      });
      await repo.save(confirmedEntity);

      const results = await repo.findPendingOlderThan(24);
      expect(
        results.find((u) => u.id === 'upload-confirmed-old'),
      ).toBeUndefined();
    });

    it('should not return recent PENDING uploads', async () => {
      const recentEntity = makeUpload({
        id: 'upload-recent',
        storageKey: 'product/user-1/recent.webp',
        status: UploadStatus.PENDING,
        createdAt: new Date(), // now
      });
      await repo.save(recentEntity);

      const results = await repo.findPendingOlderThan(24);
      expect(results.find((u) => u.id === 'upload-recent')).toBeUndefined();
    });

    it('should return empty array when no matching uploads exist', async () => {
      const results = await repo.findPendingOlderThan(24);
      expect(results).toEqual([]);
    });

    it('should correctly distinguish old PENDING from old CONFIRMED', async () => {
      const oldDate = new Date(Date.now() - 30 * 3600_000);

      await repo.save(
        makeUpload({
          id: 'upload-pending-old',
          storageKey: 'product/user-1/pending-old.webp',
          status: UploadStatus.PENDING,
          createdAt: oldDate,
        }),
      );
      await repo.save(
        makeUpload({
          id: 'upload-confirmed-old',
          storageKey: 'product/user-1/confirmed-old.webp',
          status: UploadStatus.CONFIRMED,
          createdAt: oldDate,
        }),
      );
      await repo.save(
        makeUpload({
          id: 'upload-pending-recent',
          storageKey: 'product/user-1/pending-recent.webp',
          status: UploadStatus.PENDING,
          createdAt: new Date(),
        }),
      );

      const results = await repo.findPendingOlderThan(24);
      const ids = results.map((u) => u.id);

      expect(ids).toContain('upload-pending-old');
      expect(ids).not.toContain('upload-confirmed-old');
      expect(ids).not.toContain('upload-pending-recent');
    });
  });
});
