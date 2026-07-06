import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { PrismaPaidOrderCountAdapter } from '@/modules/orders/infrastructure/prisma-paid-order-count-adapter';
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
        role: 'DESIGNER',
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

  async function ensureCheckoutGroup(ids: {
    checkoutGroupId: string;
    userId: string;
    paymentStatus: 'failed' | 'completed';
    totalAmount?: number;
    latestPaymentId?: string | null;
  }): Promise<void> {
    await prisma.checkoutGroup.upsert({
      where: { id: ids.checkoutGroupId },
      create: {
        id: ids.checkoutGroupId,
        userId: ids.userId,
        currency: 'EUR',
        totalAmount: ids.totalAmount ?? 100,
        paymentStatus: ids.paymentStatus,
        paymentAttemptCount: ids.paymentStatus === 'failed' ? 1 : 2,
        latestPaymentId: ids.latestPaymentId ?? null,
      },
      update: {
        userId: ids.userId,
        paymentStatus: ids.paymentStatus,
        totalAmount: ids.totalAmount ?? 100,
        paymentAttemptCount: ids.paymentStatus === 'failed' ? 1 : 2,
        latestPaymentId: ids.latestPaymentId ?? null,
      },
    });
  }

  function makeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
    return {
      id: 'order-int-1',
      userId: 'user-order-1',
      sellerId: 'seller-order-1',
      total: 100,
      status: 'new',
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
      expect(saved.status).toBe('new');

      const found = await repo.findById('order-int-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('order-int-1');
      expect(found!.total).toBe(100);
    });

    it('should coerce legacy object-shaped customizationSnapshot rows on readback', async () => {
      await ensurePrerequisites({
        userId: 'user-order-legacy',
        sellerId: 'seller-order-legacy',
        productId: 'prod-order-legacy',
      });

      await repo.save(
        makeOrder({
          id: 'order-legacy',
          userId: 'user-order-legacy',
          sellerId: 'seller-order-legacy',
          total: 75,
          lineItems: [
            {
              id: 'item-legacy',
              orderId: 'order-legacy',
              productId: 'prod-order-legacy',
              quantity: 1,
              customizationIdList: ['cust-legacy'],
              customizationSnapshot: null,
              unitPrice: 0,
            },
          ],
        }),
      );

      await prisma.orderLineItem.update({
        where: { id: 'item-legacy' },
        data: {
          customizationSnapshot: {
            id: 'cust-legacy',
            text: 'Legacy snapshot',
            color: 'green',
            size: 'L',
            imageUrl: null,
          } as never,
        },
      });

      const found = await repo.findById('order-legacy');
      expect(found?.lineItems?.[0].customizationSnapshot).toEqual([
        {
          id: 'cust-legacy',
          text: 'Legacy snapshot',
          color: 'green',
          size: 'L',
          imageUrl: null,
          designPosition: null,
        },
      ]);
    });

    it('should normalize malformed customizationSnapshot rows to empty arrays or null', async () => {
      await ensurePrerequisites({
        userId: 'user-order-invalid',
        sellerId: 'seller-order-invalid',
        productId: 'prod-order-invalid',
      });

      await repo.save(
        makeOrder({
          id: 'order-invalid',
          userId: 'user-order-invalid',
          sellerId: 'seller-order-invalid',
          total: 80,
          lineItems: [
            {
              id: 'item-invalid-array',
              orderId: 'order-invalid',
              productId: 'prod-order-invalid',
              quantity: 1,
              customizationIdList: [],
              customizationSnapshot: null,
              unitPrice: 0,
            },
            {
              id: 'item-invalid-scalar',
              orderId: 'order-invalid',
              productId: 'prod-order-invalid',
              quantity: 1,
              customizationIdList: [],
              customizationSnapshot: null,
              unitPrice: 0,
            },
          ],
        }),
      );

      await prisma.orderLineItem.update({
        where: { id: 'item-invalid-array' },
        data: {
          customizationSnapshot: [null, 'bad-entry'] as never,
        },
      });

      await prisma.orderLineItem.update({
        where: { id: 'item-invalid-scalar' },
        data: {
          customizationSnapshot: 'broken' as never,
        },
      });

      const found = await repo.findById('order-invalid');
      const arrayItem = found?.lineItems?.find(
        (item) => item.id === 'item-invalid-array',
      );
      const scalarItem = found?.lineItems?.find(
        (item) => item.id === 'item-invalid-scalar',
      );

      expect(arrayItem?.customizationSnapshot).toEqual([]);
      expect(scalarItem?.customizationSnapshot).toBeNull();
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
          customizationIdList: [],
          unitPrice: 0,
          customizationSnapshot: [
            {
              id: 'cust-int-1',
              text: 'Hello World',
              color: 'red',
              size: null,
              imageUrl: null,
              designPosition: null,
            },
          ],
        },
        {
          id: 'item-int-2',
          orderId: 'order-int-2',
          productId: 'prod-order-2',
          quantity: 1,
          customizationIdList: [],
          unitPrice: 0,
          customizationSnapshot: [
            {
              id: 'cust-int-2',
              text: null,
              color: null,
              size: 'XL',
              imageUrl: null,
              designPosition: null,
            },
          ],
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
      expect(item1!.customizationSnapshot).toEqual([
        {
          id: 'cust-int-1',
          text: 'Hello World',
          color: 'red',
          size: null,
          imageUrl: null,
          designPosition: null,
        },
      ]);

      const item2 = found!.lineItems!.find((i) => i.id === 'item-int-2');
      expect(item2).toBeDefined();
      expect(item2!.quantity).toBe(1);
      expect(item2!.customizationSnapshot).toEqual([
        {
          id: 'cust-int-2',
          text: null,
          color: null,
          size: 'XL',
          imageUrl: null,
          designPosition: null,
        },
      ]);
    });

    it('should persist line items with non-empty customizationIdList', async () => {
      await ensurePrerequisites({
        userId: 'user-order-2b',
        sellerId: 'seller-order-2b',
        productId: 'prod-order-2b',
      });

      // Create a customization for the product
      await prisma.customization.create({
        data: {
          id: 'cust-order-1',
          productId: 'prod-order-2b',
          text: 'Custom text',
          color: 'blue',
        },
      });

      const lineItems: OrderLineItemEntity[] = [
        {
          id: 'item-cust-1',
          orderId: 'order-int-2b',
          productId: 'prod-order-2b',
          quantity: 1,
          customizationIdList: ['cust-order-1'],
          unitPrice: 0,
          customizationSnapshot: [
            {
              id: 'cust-order-1',
              text: 'Custom text',
              color: 'blue',
              size: null,
              imageUrl: null,
              designPosition: null,
            },
          ],
        },
      ];

      const order = makeOrder({
        id: 'order-int-2b',
        userId: 'user-order-2b',
        sellerId: 'seller-order-2b',
        total: 50,
        lineItems,
      });

      await repo.save(order);

      const found = await repo.findById('order-int-2b');
      expect(found).not.toBeNull();
      expect(found!.lineItems).toHaveLength(1);
      expect(found!.lineItems![0].customizationIdList).toEqual([
        'cust-order-1',
      ]);
      expect(found!.lineItems![0].customizationSnapshot).toEqual([
        {
          id: 'cust-order-1',
          text: 'Custom text',
          color: 'blue',
          size: null,
          imageUrl: null,
          designPosition: null,
        },
      ]);
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

      await repo.updateStatus('order-int-3', 'in_progress');

      const found = await repo.findById('order-int-3');
      expect(found!.status).toBe('in_progress');
    });

    it('should throw for non-existent order', async () => {
      await expect(
        repo.updateStatus('non-existent', 'in_progress'),
      ).rejects.toThrow('Order not found');
    });
  });

  describe('findPaginated', () => {
    it('filters seller and customer views, sorts by createdAt, and respects status filters', async () => {
      await ensurePrerequisites({
        userId: 'user-order-list-a',
        sellerId: 'seller-order-list-a',
        productId: 'prod-order-list-a',
      });
      await ensurePrerequisites({
        userId: 'user-order-list-b',
        sellerId: 'seller-order-list-b',
        productId: 'prod-order-list-b',
      });
      await ensureCheckoutGroup({
        checkoutGroupId: 'cg-order-list-1',
        userId: 'user-order-list-a',
        paymentStatus: 'failed',
        totalAmount: 75,
      });
      await ensureCheckoutGroup({
        checkoutGroupId: 'cg-order-list-2',
        userId: 'user-order-list-a',
        paymentStatus: 'completed',
        totalAmount: 55,
      });
      await ensureCheckoutGroup({
        checkoutGroupId: 'cg-order-list-3',
        userId: 'user-order-list-b',
        paymentStatus: 'failed',
        totalAmount: 45,
      });

      await prisma.order.create({
        data: {
          id: 'order-list-1',
          userId: 'user-order-list-a',
          sellerId: 'seller-order-list-a',
          checkoutGroupId: 'cg-order-list-1',
          total: 75,
          status: 'new',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
      await prisma.order.create({
        data: {
          id: 'order-list-2',
          userId: 'user-order-list-a',
          sellerId: 'seller-order-list-a',
          checkoutGroupId: 'cg-order-list-2',
          total: 55,
          status: 'completed',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      });
      await prisma.order.create({
        data: {
          id: 'order-list-3',
          userId: 'user-order-list-b',
          sellerId: 'seller-order-list-b',
          checkoutGroupId: 'cg-order-list-3',
          total: 45,
          status: 'new',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      const sellerResult = await repo.findPaginated({
        sellerId: 'seller-order-list-a',
        status: 'completed',
        sortDir: 'asc',
        page: 1,
        pageSize: 10,
      });

      expect(sellerResult.total).toBe(1);
      expect(sellerResult.items).toHaveLength(1);
      expect(sellerResult.items[0]).toMatchObject({
        id: 'order-list-2',
        sellerId: 'seller-order-list-a',
        checkoutGroupPaymentStatus: 'completed',
      });

      const customerResult = await repo.findPaginated({
        userId: 'user-order-list-a',
        sortDir: 'asc',
        page: 1,
        pageSize: 10,
      });

      expect(customerResult.items.map((order) => order.id)).toEqual([
        'order-list-1',
        'order-list-2',
      ]);

      const customerDescResult = await repo.findPaginated({
        userId: 'user-order-list-a',
        sortDir: 'desc',
        page: 1,
        pageSize: 10,
      });

      expect(customerDescResult.items.map((order) => order.id)).toEqual([
        'order-list-2',
        'order-list-1',
      ]);
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
          customizationIdList: [],
          customizationSnapshot: null,
          unitPrice: 0,
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

  describe('cartId + sellerId uniqueness', () => {
    it('allows multiple manual orders with null cartId for the same seller', async () => {
      await ensurePrerequisites({
        userId: 'user-order-null-1',
        sellerId: 'seller-order-null',
        productId: 'prod-order-null-1',
      });

      await ensurePrerequisites({
        userId: 'user-order-null-2',
        sellerId: 'seller-order-null',
        productId: 'prod-order-null-2',
      });

      await repo.save(
        makeOrder({
          id: 'order-null-1',
          userId: 'user-order-null-1',
          sellerId: 'seller-order-null',
          total: 10,
          cartId: null,
        }),
      );

      await expect(
        repo.save(
          makeOrder({
            id: 'order-null-2',
            userId: 'user-order-null-2',
            sellerId: 'seller-order-null',
            total: 20,
            cartId: null,
          }),
        ),
      ).resolves.toBeDefined();
    });

    it('rejects duplicate cartId + sellerId pairs', async () => {
      await ensurePrerequisites({
        userId: 'user-order-dup',
        sellerId: 'seller-order-dup',
        productId: 'prod-order-dup',
      });

      await repo.save(
        makeOrder({
          id: 'order-dup-1',
          userId: 'user-order-dup',
          sellerId: 'seller-order-dup',
          total: 10,
          cartId: 'cart-dup-constraint',
        }),
      );

      await expect(
        repo.save(
          makeOrder({
            id: 'order-dup-2',
            userId: 'user-order-dup',
            sellerId: 'seller-order-dup',
            total: 20,
            cartId: 'cart-dup-constraint',
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('countPaidByUserId and PrismaPaidOrderCountAdapter', () => {
    it('counts completed and legacy paid orders and ignores non-paid orders', async () => {
      await ensurePrerequisites({
        userId: 'user-paid-count',
        sellerId: 'seller-paid-count-completed',
        productId: 'prod-paid-count-completed',
      });

      await ensurePrerequisites({
        userId: 'user-paid-count',
        sellerId: 'seller-paid-count-new',
        productId: 'prod-paid-count-new',
      });

      await ensurePrerequisites({
        userId: 'user-paid-count',
        sellerId: 'seller-paid-count-progress',
        productId: 'prod-paid-count-progress',
      });

      await repo.save(
        makeOrder({
          id: 'order-paid-count-completed',
          userId: 'user-paid-count',
          sellerId: 'seller-paid-count-completed',
          total: 100,
          status: 'completed',
        }),
      );

      await repo.save(
        makeOrder({
          id: 'order-paid-count-legacy-paid',
          userId: 'user-paid-count',
          sellerId: 'seller-paid-count-completed',
          total: 100,
          status: 'paid',
        }),
      );

      await repo.save(
        makeOrder({
          id: 'order-paid-count-new',
          userId: 'user-paid-count',
          sellerId: 'seller-paid-count-new',
          total: 100,
          status: 'new',
        }),
      );

      await repo.save(
        makeOrder({
          id: 'order-paid-count-progress',
          userId: 'user-paid-count',
          sellerId: 'seller-paid-count-progress',
          total: 100,
          status: 'in_progress',
        }),
      );

      const adapter = new PrismaPaidOrderCountAdapter(repo);

      await expect(
        adapter.countPaidOrdersByUserId('user-paid-count'),
      ).resolves.toBe(2);
      await expect(repo.countPaidByUserId('user-paid-count')).resolves.toBe(2);
    });

    it('returns zero when a user only has non-completed orders', async () => {
      await ensurePrerequisites({
        userId: 'user-unpaid-count',
        sellerId: 'seller-unpaid-count-new',
        productId: 'prod-unpaid-count-new',
      });

      await ensurePrerequisites({
        userId: 'user-unpaid-count',
        sellerId: 'seller-unpaid-count-progress',
        productId: 'prod-unpaid-count-progress',
      });

      await repo.save(
        makeOrder({
          id: 'order-unpaid-count-new',
          userId: 'user-unpaid-count',
          sellerId: 'seller-unpaid-count-new',
          total: 100,
          status: 'new',
        }),
      );

      await repo.save(
        makeOrder({
          id: 'order-unpaid-count-progress',
          userId: 'user-unpaid-count',
          sellerId: 'seller-unpaid-count-progress',
          total: 100,
          status: 'in_progress',
        }),
      );

      const adapter = new PrismaPaidOrderCountAdapter(repo);

      await expect(
        adapter.countPaidOrdersByUserId('user-unpaid-count'),
      ).resolves.toBe(0);
      await expect(repo.countPaidByUserId('user-unpaid-count')).resolves.toBe(
        0,
      );
    });
  });
});
