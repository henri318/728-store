import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { prisma } from '@/shared/infrastructure/prisma';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { PrismaTransactionRunner } from '@/shared/infrastructure/prisma-transaction-runner';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { MemoryOrderCustomizationLookup } from '@/tests/doubles/memory-order-customization-lookup';

class FailingOutboxRepository extends PrismaOutboxRepository {
  override async saveEvent(
    eventType: string,
    payload: unknown,
    tx?: unknown,
  ): Promise<void> {
    await super.saveEvent(eventType, payload, tx as never);
    throw new Error('boom');
  }
}

describe('HandleCartCheckedOut — Integration', () => {
  beforeAll(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  async function ensurePrerequisites(ids: {
    userId: string;
    sellerId: string;
    productId: string;
  }): Promise<void> {
    await prisma.user.upsert({
      where: { id: ids.userId },
      create: {
        id: ids.userId,
        email: `${ids.userId}@test.com`,
        firstName: 'Cart',
        lastName: 'Buyer',
        role: 'CUSTOMER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

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
        name: `Seller ${ids.sellerId}`,
        userId: `user-for-${ids.sellerId}`,
        status: 'active',
      },
      update: {},
    });

    await prisma.product.upsert({
      where: { id: ids.productId },
      create: {
        id: ids.productId,
        basePrice: 50,
        sellerId: ids.sellerId,
      },
      update: {},
    });
  }

  it('rolls back the order and outbox writes if a transaction step fails', async () => {
    await ensurePrerequisites({
      userId: 'user-cart-tx',
      sellerId: 'seller-cart-tx',
      productId: 'product-cart-tx',
    });

    const useCase = new HandleCartCheckedOut(
      new PrismaOrderRepository(),
      new FailingOutboxRepository(),
      new PrismaTransactionRunner(),
      new MemoryOrderCustomizationLookup(),
    );

    const payload = {
      cartId: 'cart-tx-rollback',
      userId: 'user-cart-tx',
      items: [
        {
          productId: 'product-cart-tx',
          sellerId: 'seller-cart-tx',
          quantity: 1,
          unitPrice: 50,
          customizationIdList: ['cust-cart-tx'],
          customizationSnapshot: [
            {
              id: 'cust-cart-tx',
              text: 'Hello',
              color: 'red',
              size: 'M',
              imageUrl: null,
            },
          ],
        },
      ],
      subtotal: 50,
      discountApplied: 0,
      shippingCost: 3.99,
      totalAmount: 53.99,
      currency: 'EUR' as const,
      isFirstPurchase: false,
      occurredAt: new Date().toISOString(),
    };

    await expect(useCase.execute(payload)).rejects.toThrow('boom');

    const orders = await prisma.order.findMany({
      where: { cartId: payload.cartId },
    });
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { eventType: GlobalEvents.ORDER_CREATED },
    });

    expect(orders).toHaveLength(0);
    expect(outboxEvents).toHaveLength(0);
  });
});
