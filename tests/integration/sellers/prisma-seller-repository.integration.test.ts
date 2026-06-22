import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaSellerRepository } from '@/modules/sellers/infrastructure/prisma-seller-repository';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * PrismaSellerRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies CRUD operations, soft-delete filtering, status filtering,
 * and name/userId lookups through the actual Prisma adapter (no mocks).
 *
 * Each test creates a linked User row first (FK requirement).
 * Unique IDs and names per test avoid unique-constraint collisions.
 */
describe('PrismaSellerRepository — Integration', () => {
  let repo: PrismaSellerRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaSellerRepository();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  /** Create a prerequisite User row for the FK constraint. */
  async function ensureUser(userId: string, email: string): Promise<void> {
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        firstName: 'Seller',
        lastName: 'Owner',
        role: 'CUSTOMER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });
  }

  function makeSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
    return {
      sellerId: SellerId.create('seller-int-1'),
      name: 'Test Seller',
      description: 'A test seller',
      userId: 'user-seller-1',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  describe('save + findById', () => {
    it('should persist a seller and retrieve it by ID', async () => {
      await ensureUser('user-seller-1', 'seller1@test.com');
      const seller = makeSeller();
      const saved = await repo.save(seller);

      expect(saved.sellerId.value).toBe('seller-int-1');
      expect(saved.name).toBe('Test Seller');
      expect(saved.description).toBe('A test seller');
      expect(saved.userId).toBe('user-seller-1');
      expect(saved.status).toBe(SellerStatus.ACTIVE);

      const found = await repo.findById('seller-int-1');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Test Seller');
      expect(found!.userId).toBe('user-seller-1');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find a seller by name', async () => {
      await ensureUser('user-seller-2', 'seller2@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-2'),
          name: 'Unique Seller',
          userId: 'user-seller-2',
        }),
      );

      const found = await repo.findByName('Unique Seller');
      expect(found).not.toBeNull();
      expect(found!.sellerId.value).toBe('seller-int-2');
    });

    it('should return null for non-existent name', async () => {
      const found = await repo.findByName('Ghost Seller');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted sellers', async () => {
      await ensureUser('user-seller-3', 'seller3@test.com');
      await ensureUser('user-seller-4', 'seller4@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-3'),
          name: 'Seller Alpha',
          userId: 'user-seller-3',
        }),
      );
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-4'),
          name: 'Seller Beta',
          userId: 'user-seller-4',
        }),
      );

      const all = await repo.findAll();
      const names = all.map((s) => s.name);
      expect(names).toContain('Seller Alpha');
      expect(names).toContain('Seller Beta');
    });
  });

  describe('findAllByStatus', () => {
    it('should filter sellers by status', async () => {
      await ensureUser('user-seller-5', 'seller5@test.com');
      await ensureUser('user-seller-6', 'seller6@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-5'),
          name: 'Active Seller',
          userId: 'user-seller-5',
          status: SellerStatus.ACTIVE,
        }),
      );
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-6'),
          name: 'Suspended Seller',
          userId: 'user-seller-6',
          status: SellerStatus.SUSPENDED,
        }),
      );

      const active = await repo.findAllByStatus(SellerStatus.ACTIVE);
      expect(active.every((s) => s.status === SellerStatus.ACTIVE)).toBe(true);
      expect(active.some((s) => s.name === 'Active Seller')).toBe(true);

      const suspended = await repo.findAllByStatus(SellerStatus.SUSPENDED);
      expect(suspended.every((s) => s.status === SellerStatus.SUSPENDED)).toBe(
        true,
      );
      expect(suspended.some((s) => s.name === 'Suspended Seller')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update seller fields', async () => {
      await ensureUser('user-seller-7', 'seller7@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-7'),
          name: 'Original Name',
          description: 'Original desc',
          userId: 'user-seller-7',
        }),
      );

      const seller = await repo.findById('seller-int-7');
      const updated = await repo.update({
        ...seller!,
        name: 'Updated Name',
        description: 'Updated desc',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated desc');

      const found = await repo.findById('seller-int-7');
      expect(found!.name).toBe('Updated Name');
    });
  });

  describe('findByUserId', () => {
    it('should find a seller by userId', async () => {
      await ensureUser('user-seller-8', 'seller8@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-8'),
          name: 'User-linked Seller',
          userId: 'user-seller-8',
        }),
      );

      const found = await repo.findByUserId('user-seller-8');
      expect(found).not.toBeNull();
      expect(found!.sellerId.value).toBe('seller-int-8');
    });

    it('should return null for non-existent userId', async () => {
      const found = await repo.findByUserId('no-user-here');
      expect(found).toBeNull();
    });
  });

  describe('soft-delete', () => {
    it('should exclude soft-deleted sellers from all queries', async () => {
      await ensureUser('user-seller-9', 'seller9@test.com');
      await repo.save(
        makeSeller({
          sellerId: SellerId.create('seller-int-9'),
          name: 'Deleted Seller',
          userId: 'user-seller-9',
        }),
      );

      await repo.softDelete('seller-int-9');

      // findById filters deletedAt: null
      const found = await repo.findById('seller-int-9');
      expect(found).toBeNull();

      // findByName filters deletedAt: null
      const byName = await repo.findByName('Deleted Seller');
      expect(byName).toBeNull();

      // findByUserId filters deletedAt: null
      const byUser = await repo.findByUserId('user-seller-9');
      expect(byUser).toBeNull();

      // findAll filters deletedAt: null
      const all = await repo.findAll();
      expect(all.some((s) => s.sellerId.value === 'seller-int-9')).toBe(false);

      // findAllByStatus filters deletedAt: null
      const byStatus = await repo.findAllByStatus(SellerStatus.ACTIVE);
      expect(byStatus.some((s) => s.sellerId.value === 'seller-int-9')).toBe(
        false,
      );
    });
  });
});
