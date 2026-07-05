import { prisma } from '@/shared/infrastructure/prisma';
import type { CheckoutGroupLookupPort } from '../domain/checkout-group-lookup-port';
import type { CheckoutGroupEntity } from '../domain/entities/checkout-group';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

export class PrismaCheckoutGroupLookup implements CheckoutGroupLookupPort {
  async findById(checkoutGroupId: string): Promise<CheckoutGroupEntity | null> {
    const group = await prisma.checkoutGroup.findUnique({
      where: { id: checkoutGroupId },
      include: {
        orders: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!group) return null;

    return {
      id: group.id,
      userId: group.userId,
      currency: 'EUR',
      totalAmount: Money.create(Number(group.totalAmount), Currency.EUR),
      paymentStatus:
        group.paymentStatus as CheckoutGroupEntity['paymentStatus'],
      paymentAttemptCount: group.paymentAttemptCount,
      latestPaymentId: group.latestPaymentId,
      linkedOrders: group.orders.map((order) => ({
        orderId: order.id,
        checkoutGroupId: group.id,
        sellerId: order.sellerId,
        total: Money.create(Number(order.total), Currency.EUR),
        status: order.status,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}
