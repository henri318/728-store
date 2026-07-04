import { describe, expect, it, vi } from 'vitest';
import type { OrderEntity } from '@/modules/orders/domain/entities/order';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import {
  ORDER_LIFECYCLE_STATUSES,
  ORDER_LIFECYCLE_TRANSITIONS,
  canTransitionOrderStatus,
} from '@/modules/orders/domain/value-objects/order-lifecycle';

describe('Order contracts', () => {
  it('persists checkoutGroupId through Prisma order saves', async () => {
    const orderCreate = vi.fn().mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      checkoutGroupId: 'checkout-group-1',
      total: 99.5,
      status: ORDER_LIFECYCLE_STATUSES.NEW,
      cartId: null,
    });
    const orderLineItemCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new PrismaOrderRepository();

    const order: OrderEntity = {
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 99.5,
      status: ORDER_LIFECYCLE_STATUSES.NEW,
      checkoutGroupId: 'checkout-group-1',
      lineItems: [],
    };

    const saved = await repository.save(order, {
      order: {
        create: orderCreate,
      },
      orderLineItem: {
        createMany: orderLineItemCreateMany,
      },
    } as never);

    expect(orderCreate).toHaveBeenCalledWith({
      data: {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        checkoutGroupId: 'checkout-group-1',
        total: 99.5,
        status: ORDER_LIFECYCLE_STATUSES.NEW,
        cartId: null,
      },
    });
    expect(orderLineItemCreateMany).not.toHaveBeenCalled();
    expect(saved.checkoutGroupId).toBe('checkout-group-1');
  });

  it('stores manual orders with a null checkoutGroupId when the field is omitted', async () => {
    const orderCreate = vi.fn().mockResolvedValue({
      id: 'order-2',
      userId: 'user-2',
      sellerId: 'seller-2',
      checkoutGroupId: null,
      total: 25,
      status: ORDER_LIFECYCLE_STATUSES.NEW,
      cartId: null,
    });
    const orderLineItemCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new PrismaOrderRepository();

    const saved = await repository.save(
      {
        id: 'order-2',
        userId: 'user-2',
        sellerId: 'seller-2',
        total: 25,
        status: ORDER_LIFECYCLE_STATUSES.NEW,
        lineItems: [],
      },
      {
        order: {
          create: orderCreate,
        },
        orderLineItem: {
          createMany: orderLineItemCreateMany,
        },
      } as never,
    );

    expect(orderCreate).toHaveBeenCalledWith({
      data: {
        id: 'order-2',
        userId: 'user-2',
        sellerId: 'seller-2',
        checkoutGroupId: null,
        total: 25,
        status: ORDER_LIFECYCLE_STATUSES.NEW,
        cartId: null,
      },
    });
    expect(orderLineItemCreateMany).not.toHaveBeenCalled();
    expect(saved.checkoutGroupId).toBeNull();
  });

  it('defines the fulfillment lifecycle graph for seller orders', () => {
    expect(ORDER_LIFECYCLE_STATUSES).toEqual({
      NEW: 'new',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
    });

    const cases: Array<
      [
        (typeof ORDER_LIFECYCLE_STATUSES)[keyof typeof ORDER_LIFECYCLE_STATUSES],
        (typeof ORDER_LIFECYCLE_STATUSES)[keyof typeof ORDER_LIFECYCLE_STATUSES],
        boolean,
      ]
    > = [
      ['new', 'in_progress', true],
      ['new', 'completed', false],
      ['in_progress', 'completed', true],
      ['in_progress', 'new', false],
      ['completed', 'new', false],
      ['completed', 'in_progress', false],
    ];

    for (const [from, to, expected] of cases) {
      expect(canTransitionOrderStatus(from, to)).toBe(expected);
    }

    expect(ORDER_LIFECYCLE_TRANSITIONS).toEqual({
      new: ['in_progress'],
      in_progress: ['completed'],
      completed: [],
    });
  });
});
