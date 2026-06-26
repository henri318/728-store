import type { PrismaClient } from '@prisma/client';
import {
  OrderEntity,
  OrderRepository,
  OrderLineItemEntity,
  OrderStatus,
} from '../domain/order-repository';
import { prisma } from '@/shared/infrastructure/prisma';

export class PrismaOrderRepository implements OrderRepository {
  /**
   * Update order status within a transaction
   * This method is designed to be used with Prisma's transaction client
   */
  async updateStatusWithTransaction(
    tx: Omit<
      PrismaClient,
      '$extends' | '$transaction' | '$connect' | '$disconnect' | '$use'
    >,
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
  async save(order: OrderEntity): Promise<OrderEntity> {
    // If order.id is already set, it means we are updating an existing order (though save often implies create)
    // For simplicity, assuming save is for creating a new order or replacing existing data.
    // In a real app, you might differentiate between create and update.

    // First, save the order itself.
    const savedOrder = await prisma.order.create({
      data: {
        id: order.id,
        userId: order.userId,
        sellerId: order.sellerId,
        total: order.total,
        status: order.status,
        // Persist the source cartId for cart-derived orders so the
        // HandleCartCheckedOut idempotency check works against the
        // production adapter (spec REQ-ORD-001). Null for manual orders.
        cartId: order.cartId ?? null,
        // Prisma will handle createdAt and updatedAt automatically
        // We will save line items in a separate step or transaction
      },
    });

    // Now, save the associated line items.
    // We need to ensure that order.lineItems is populated when passed to this method.
    if (order.lineItems && order.lineItems.length > 0) {
      await this.saveOrderLineItems(savedOrder.id, order.lineItems);
    }

    // Return the saved order, potentially re-fetched to include line items if needed by caller.
    // For now, returning the created order and assuming line items are saved separately.
    // A more complete implementation would fetch the order WITH its lineItems.
    return {
      ...savedOrder,
      total: Number(savedOrder.total), // Ensure total is number if it's Decimal in DB
      lineItems: order.lineItems || [], // Populate lineItems from the input order object
    };
  }

  async saveOrderLineItems(
    orderId: string,
    lineItems: OrderLineItemEntity[],
  ): Promise<void> {
    if (!lineItems || lineItems.length === 0) {
      return; // No line items to save
    }

    // Create OrderLineItem records associated with the orderId
    await prisma.orderLineItem.createMany({
      data: lineItems.map((item) => ({
        id: item.id, // Assuming IDs are generated or passed correctly
        orderId: orderId,
        productId: item.productId,
        quantity: item.quantity,
        customizationText: item.customizationText,
        customizationColor: item.customizationColor,
        customizationSize: item.customizationSize,
        customizationImageUrl: item.customizationImageUrl,
      })),
    });
  }

  async findById(orderId: string): Promise<OrderEntity | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return null;
    }

    // Fetch associated line items
    const lineItems = await prisma.orderLineItem.findMany({
      where: { orderId },
    });

    return {
      ...order,
      total: Number(order.total),
      lineItems: lineItems.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        customizationText: item.customizationText,
        customizationColor: item.customizationColor,
        customizationSize: item.customizationSize,
        customizationImageUrl: item.customizationImageUrl,
      })),
    };
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  /**
   * Returns every order id that was created from the given cart id.
   *
   * Used by HandleCartCheckedOut to dedupe duplicate CART_CHECKED_OUT
   * deliveries (spec REQ-ORD-001, idempotency). The lookup is a
   * simple equality on the `cartId` column, which is indexed.
   */
  async findIdsByCartId(cartId: string): Promise<string[]> {
    const rows = await prisma.order.findMany({
      where: { cartId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /**
   * Returns the count of orders in 'paid' status for the given user.
   * Used by the Cart module (via PaidOrderCountPort adapter) to determine
   * whether the first-purchase discount applies (spec REQ-CART-016).
   */
  async countPaidByUserId(userId: string): Promise<number> {
    return await prisma.order.count({
      where: { userId, status: 'paid' },
    });
  }
}
