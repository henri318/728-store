import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaCustomizationRepository } from '@/modules/customizations/infrastructure/prisma-customization-repository';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * PrismaCustomizationRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies:
 *  - findByIds partial result (missing IDs silently absent)
 *  - findBySellerId scopes correctly (via Product relation)
 *  - isReferencedByOrders detects OrderLineItem references
 *  - delete removes the row
 *
 * FK chain: User → Seller → Product → Customization
 */
describe('PrismaCustomizationRepository — Integration', () => {
  let repo: PrismaCustomizationRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaCustomizationRepository();

    // Seed prerequisite data
    await prisma.user.upsert({
      where: { id: 'user-seller-cust' },
      create: {
        id: 'user-seller-cust',
        email: 'seller-cust@test.com',
        firstName: 'Seller',
        lastName: 'Cust',
        role: 'DESIGNER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: 'user-seller-cust-2' },
      create: {
        id: 'user-seller-cust-2',
        email: 'seller-cust-2@test.com',
        firstName: 'Seller',
        lastName: 'Cust2',
        role: 'DESIGNER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.seller.upsert({
      where: { id: 'seller-cust-1' },
      create: {
        id: 'seller-cust-1',
        name: 'Cust Seller 1',
        userId: 'user-seller-cust',
        status: 'active',
      },
      update: {},
    });

    await prisma.seller.upsert({
      where: { id: 'seller-cust-2' },
      create: {
        id: 'seller-cust-2',
        name: 'Cust Seller 2',
        userId: 'user-seller-cust-2',
        status: 'active',
      },
      update: {},
    });

    await prisma.product.upsert({
      where: { id: 'prod-cust-1' },
      create: {
        id: 'prod-cust-1',
        basePrice: 50,
        sellerId: 'seller-cust-1',
      },
      update: {},
    });

    await prisma.product.upsert({
      where: { id: 'prod-cust-2' },
      create: {
        id: 'prod-cust-2',
        basePrice: 75,
        sellerId: 'seller-cust-2',
      },
      update: {},
    });

    // Seed customizations (no sellerId — derived from Product)
    await prisma.customization.createMany({
      data: [
        {
          id: 'C1',
          productId: 'prod-cust-1',
          text: 'Hello',
          color: 'red',
        },
        {
          id: 'C2',
          productId: 'prod-cust-1',
          text: 'World',
          size: 'M',
        },
        {
          id: 'C3',
          productId: 'prod-cust-2',
          text: 'Other seller',
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupDb();
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const result = await repo.findById('C1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('C1');
      expect(result!.text).toBe('Hello');
      expect(result!.color).toBe('red');
      expect(result!.productId).toBe('prod-cust-1');
    });

    it('should return null for non-existent id', async () => {
      const result = await repo.findById('GHOST');
      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should return partial results for missing IDs', async () => {
      const results = await repo.findByIds(['C1', 'GHOST', 'C3']);
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id).sort();
      expect(ids).toEqual(['C1', 'C3']);
    });

    it('should return empty array for empty input', async () => {
      const results = await repo.findByIds([]);
      expect(results).toHaveLength(0);
    });

    it('should return empty array for all missing IDs', async () => {
      const results = await repo.findByIds(['GHOST1', 'GHOST2']);
      expect(results).toHaveLength(0);
    });
  });

  describe('findBySellerId', () => {
    it('should scope by seller via Product relation', async () => {
      const results = await repo.findBySellerId('seller-cust-1');
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id).sort();
      expect(ids).toEqual(['C1', 'C2']);
    });

    it('should return empty for seller with no customizations', async () => {
      const results = await repo.findBySellerId('seller-nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('findByProductId', () => {
    it('should return customizations for a product', async () => {
      const results = await repo.findByProductId('prod-cust-1');
      expect(results).toHaveLength(2);
    });
  });

  describe('save', () => {
    it('should persist a new customization', async () => {
      const entity = await repo.save({
        id: 'C-NEW',
        productId: 'prod-cust-1',
        text: 'New one',
        color: null,
        size: null,
        imageUrl: null,
        createdAt: new Date(),
      });

      expect(entity.id).toBe('C-NEW');
      const found = await repo.findById('C-NEW');
      expect(found).not.toBeNull();
      expect(found!.text).toBe('New one');
    });

    it('should update an existing customization', async () => {
      await repo.save({
        id: 'C-NEW',
        productId: 'prod-cust-1',
        text: 'Updated',
        color: 'blue',
        size: null,
        imageUrl: null,
        createdAt: new Date(),
      });

      const found = await repo.findById('C-NEW');
      expect(found!.text).toBe('Updated');
      expect(found!.color).toBe('blue');
    });
  });

  describe('delete', () => {
    it('should remove the row', async () => {
      await repo.delete('C-NEW');
      const found = await repo.findById('C-NEW');
      expect(found).toBeNull();
    });
  });

  describe('isReferencedByOrders', () => {
    it('should return false when not referenced', async () => {
      const result = await repo.isReferencedByOrders('C1');
      expect(result).toBe(false);
    });

    it('should return true when referenced by OrderLineItem', async () => {
      // Create an order with a line item referencing C1
      await prisma.user.upsert({
        where: { id: 'user-order-cust' },
        create: {
          id: 'user-order-cust',
          email: 'order-cust@test.com',
          firstName: 'Order',
          lastName: 'User',
          role: 'CUSTOMER',
          passwordHash: 'hashed-pw',
        },
        update: {},
      });

      await prisma.order.create({
        data: {
          id: 'order-cust-1',
          userId: 'user-order-cust',
          sellerId: 'seller-cust-1',
          total: 100,
          lineItems: {
            create: {
              id: 'li-cust-1',
              productId: 'prod-cust-1',
              quantity: 1,
              customizationIdList: ['C1'],
              customizationSnapshot: { text: 'Hello', color: 'red' },
            },
          },
        },
      });

      const result = await repo.isReferencedByOrders('C1');
      expect(result).toBe(true);

      // C2 should still be unreferenced
      const result2 = await repo.isReferencedByOrders('C2');
      expect(result2).toBe(false);
    });
  });
});
