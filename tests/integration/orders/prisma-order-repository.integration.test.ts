import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import type {
  OrderEntity,
  OrderLineItemEntity,
} from '@/modules/orders/domain/order-repository';

/**
 * PrismaOrderRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies CRUD operations, status updates, and line item persistence
 * through the actual Prisma adapter (no mocks).
 *
 * FK chain: User → Seller → Product → Order → OrderLineItem
 */
describe('PrismaOrderRepository — Integration', () => {
  let repo: PrismaOrderRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaOrderRepository();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  /** Create prerequisite rows for FK constraints. */
  async function ensurePrerequisites(ids: {
    userId: string;
    sellerId: string;
    productId: string;
    userEmail?: string;
    sellerName?: string;
  }): Promise<void> {
    await prisma.user.upsert({
      where: { id: ids.userId },
      create: {
        id: ids.userId,
        email: ids.userEmail ?? `${ids.userId}@test.com`,
        firstName: 'Order',
        lastName: 'Buyer',
        role: 'CUSTOMER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    // Seller's linked user must exist before the seller (FK constraint)
    await prisma.user.upsert({
      where: { id: `user-for-${ids.sellerId}` },
      create: {
        id: `user-for-${ids.sellerId}`,
        email: `seller-owner-${ids.sellerId}@test.com`,
        firstName: 'Seller',
        lastName: 'Owner',
        role: 'SELLER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.seller.upsert({
      where: { id: ids.sellerId },
      create: {
        id: ids.sellerId,
        name: ids.sellerName ?? `Seller ${ids.sellerId}`,
        userId: `user-for-${ids.sellerId}`,
        status: 'active',
      },
      update: {},
    });

    await prisma.product.upsert({
      where: { id: ids.productId },
      create: {
        id: ids.productId,
        basePrice: 50.0,
        sellerId: ids.sellerId,
      },
      update: {},
    });
  }

  function makeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
    return {
      id: 'order-int-1',
      userId: 'user-order-1',
      sellerId: 'seller-order-1',
      total: 100,
      status: 'pending',
      lineItems: [],
      ...overrides,
    };
  }

  describe('save + findById', () => {
    it('should persist an order and retrieve it by ID', async () => {
      await ensurePrerequisites({
        userId: 'user-order-1',
        sellerId: 'seller-order-1',
        productId: 'prod-order-1',
      });

      const order = makeOrder();
      const saved = await repo.save(order);

      expect(saved.id).toBe('order-int-1');
      expect(saved.userId).toBe('user-order-1');
      expect(saved.sellerId).toBe('seller-order-1');
      expect(saved.status).toBe('pending');

      const found = await repo.findById('order-int-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('order-int-1');
      expect(found!.total).toBe(100);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('save with line items', () => {
    it('should persist order with line items and retrieve them', async () => {
      await ensurePrerequisites({
        userId: 'user-order-2',
        sellerId: 'seller-order-2',
        productId: 'prod-order-2',
      });

      const lineItems: OrderLineItemEntity[] = [
        {
          id: 'item-int-1',
          orderId: 'order-int-2',
          productId: 'prod-order-2',
          quantity: 2,
          customizationText: 'Hello World',
          customizationColor: 'red',
        },
        {
          id: 'item-int-2',
          orderId: 'order-int-2',
          productId: 'prod-order-2',
          quantity: 1,
          customizationSize: 'XL',
        },
      ];

      const order = makeOrder({
        id: 'order-int-2',
        userId: 'user-order-2',
        sellerId: 'seller-order-2',
        total: 150,
        lineItems,
      });

      await repo.save(order);

      const found = await repo.findById('order-int-2');
      expect(found).not.toBeNull();
      expect(found!.lineItems).toHaveLength(2);

      const item1 = found!.lineItems!.find((i) => i.id === 'item-int-1');
      expect(item1).toBeDefined();
      expect(item1!.quantity).toBe(2);
      expect(item1!.customizationText).toBe('Hello World');
      expect(item1!.customizationColor).toBe('red');

      const item2 = found!.lineItems!.find((i) => i.id === 'item-int-2');
      expect(item2).toBeDefined();
      expect(item2!.quantity).toBe(1);
      expect(item2!.customizationSize).toBe('XL');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      await ensurePrerequisites({
        userId: 'user-order-3',
        sellerId: 'seller-order-3',
        productId: 'prod-order-3',
      });

      await repo.save(
        makeOrder({
          id: 'order-int-3',
          userId: 'user-order-3',
          sellerId: 'seller-order-3',
        }),
      );

      await repo.updateStatus('order-int-3', 'paid');

      const found = await repo.findById('order-int-3');
      expect(found!.status).toBe('paid');
    });

    it('should throw for non-existent order', async () => {
      await expect(repo.updateStatus('non-existent', 'paid')).rejects.toThrow(
        'Order not found',
      );
    });
  });

  describe('saveOrderLineItems', () => {
    it('should save line items separately for an existing order', async () => {
      await ensurePrerequisites({
        userId: 'user-order-4',
        sellerId: 'seller-order-4',
        productId: 'prod-order-4',
      });

      await repo.save(
        makeOrder({
          id: 'order-int-4',
          userId: 'user-order-4',
          sellerId: 'seller-order-4',
          total: 200,
        }),
      );

      const items: OrderLineItemEntity[] = [
        {
          id: 'item-sep-1',
          orderId: 'order-int-4',
          productId: 'prod-order-4',
          quantity: 3,
        },
      ];

      await repo.saveOrderLineItems('order-int-4', items);

      const found = await repo.findById('order-int-4');
      expect(found!.lineItems).toHaveLength(1);
      expect(found!.lineItems![0].quantity).toBe(3);
    });

    it('should handle empty line items array', async () => {
      await expect(
        repo.saveOrderLineItems('order-int-4', []),
      ).resolves.toBeUndefined();
    });
  });
});
