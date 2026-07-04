import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import { cleanupDb } from '@/tests/helpers/test-db';

describe('PrismaOrderRepository — checkout group contract', () => {
  const repository = new PrismaOrderRepository();

  beforeAll(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  it('round-trips checkoutGroupId through Prisma persistence', async () => {
    await prisma.user.upsert({
      where: { id: 'user-checkout-group-contract' },
      create: {
        id: 'user-checkout-group-contract',
        email: 'checkout-group-contract@test.com',
        firstName: 'Checkout',
        lastName: 'Buyer',
        role: 'CUSTOMER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: 'user-seller-checkout-group-contract' },
      create: {
        id: 'user-seller-checkout-group-contract',
        email: 'seller-checkout-group-contract@test.com',
        firstName: 'Seller',
        lastName: 'Owner',
        role: 'DESIGNER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.seller.upsert({
      where: { id: 'seller-checkout-group-contract' },
      create: {
        id: 'seller-checkout-group-contract',
        name: 'Seller Checkout Group Contract',
        userId: 'user-seller-checkout-group-contract',
        status: 'active',
      },
      update: {},
    });

    await prisma.checkoutGroup.upsert({
      where: { id: 'checkout-group-contract-1' },
      create: {
        id: 'checkout-group-contract-1',
        userId: 'user-checkout-group-contract',
        currency: 'EUR',
        totalAmount: 42,
        paymentStatus: 'PENDING',
        paymentAttemptCount: 0,
      },
      update: {},
    });

    const orderId = 'order-checkout-group-contract';
    const checkoutGroupId = 'checkout-group-contract-1';

    await repository.save({
      id: orderId,
      userId: 'user-checkout-group-contract',
      sellerId: 'seller-checkout-group-contract',
      checkoutGroupId,
      total: 42,
      status: 'new',
      lineItems: [],
    });

    const persisted = await prisma.order.findUnique({
      where: { id: orderId },
      select: { checkoutGroupId: true },
    });

    expect(persisted?.checkoutGroupId).toBe(checkoutGroupId);

    const hydrated = await repository.findById(orderId);

    expect(hydrated).not.toBeNull();
    expect(hydrated?.checkoutGroupId).toBe(checkoutGroupId);
  });
});
