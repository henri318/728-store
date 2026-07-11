import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { coerceDesignPosition } from '@/shared/kernel/domain/value-objects/design-position';
import type { CustomizationSnapshot } from '../domain/customization-lookup-port';
import {
  OrderEntity,
  OrderRepository,
  OrderLineItemEntity,
  OrderStatus,
  OrderListFilter,
} from '../domain/order-repository';
import { ORDER_PAID_PURCHASE_STATUSES } from '../domain/value-objects/order-lifecycle';
import { prisma } from '@/shared/infrastructure/prisma';

type PrismaTx = Omit<
  PrismaClient,
  '$extends' | '$transaction' | '$connect' | '$disconnect' | '$use'
>;

export class PrismaOrderRepository implements OrderRepository {
  async findPaginated(
    filter: OrderListFilter,
    locale: string = 'es',
  ): Promise<PaginatedResult<OrderEntity>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const sortDir = filter.sortDir ?? 'desc';
    const where: Prisma.OrderWhereInput = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.sellerId) where.sellerId = filter.sellerId;
    if (filter.status && filter.status !== 'all') where.status = filter.status;
    if (filter.q) {
      where.lineItems = {
        some: {
          product: {
            translations: {
              some: {
                name: { contains: filter.q, mode: 'insensitive' },
              },
            },
          },
        },
      };
    }

    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          lineItems: {
            include: {
              product: {
                include: {
                  translations: { where: { locale } },
                  images: { take: 1, orderBy: { position: 'asc' } },
                },
              },
            },
          },
          checkoutGroup: { select: { paymentStatus: true } },
        },
        orderBy: { createdAt: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((order) => {
        const { checkoutGroup, lineItems, total, ...rest } = order;
        return {
          ...rest,
          total: Number(total),
          checkoutGroupPaymentStatus: checkoutGroup?.paymentStatus ?? null,
          lineItems: lineItems.map((item) => mapOrderLineItem(item)),
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update order status within a transaction
   * This method is designed to be used with Prisma's transaction client
   */
  async updateStatusWithTransaction(
    tx: PrismaTx,
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
  async save(order: OrderEntity, tx: PrismaTx = prisma): Promise<OrderEntity> {
    // If order.id is already set, it means we are updating an existing order (though save often implies create)
    // For simplicity, assuming save is for creating a new order or replacing existing data.
    // In a real app, you might differentiate between create and update.

    // First, save the order itself.
    const savedOrder = await tx.order.create({
      data: {
        id: order.id,
        userId: order.userId,
        sellerId: order.sellerId,
        checkoutGroupId: order.checkoutGroupId ?? null,
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
      await this.saveOrderLineItems(savedOrder.id, order.lineItems, tx);
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
    tx: PrismaTx = prisma,
  ): Promise<void> {
    if (!lineItems || lineItems.length === 0) {
      return; // No line items to save
    }

    // Create OrderLineItem records associated with the orderId
    await tx.orderLineItem.createMany({
      data: lineItems.map((item) => ({
        id: item.id,
        orderId: orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productImageUrl: item.productImageUrl,
        customizationIdList: item.customizationIdList,
        customizationSnapshot: (item.customizationSnapshot ??
          Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  async findById(
    orderId: string,
    locale: string = 'es',
  ): Promise<OrderEntity | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: {
          include: {
            product: {
              include: {
                translations: { where: { locale } },
                images: { take: 1, orderBy: { position: 'asc' } },
              },
            },
          },
        },
        checkoutGroup: { select: { paymentStatus: true } },
      },
    });

    if (!order) {
      return null;
    }

    const { checkoutGroup, lineItems, total, ...rest } = order;
    return {
      ...rest,
      total: Number(total),
      checkoutGroupPaymentStatus: checkoutGroup?.paymentStatus ?? null,
      lineItems: lineItems.map((item) => mapOrderLineItem(item)),
    };
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    tx?: unknown,
  ): Promise<void> {
    const client = tx as PrismaTx | undefined;
    const db = client ?? prisma;

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await db.order.update({
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
  async findIdsByCartId(
    cartId: string,
    tx: PrismaTx = prisma,
  ): Promise<string[]> {
    const rows = await tx.order.findMany({
      where: { cartId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /**
   * Returns the count of paid-purchase orders for the given user.
   * Includes legacy `paid` rows for backward compatibility.
   * Used by the Cart module (via PaidOrderCountPort adapter) to determine
   * whether the first-purchase discount applies (spec REQ-CART-016).
   */
  async countPaidByUserId(userId: string): Promise<number> {
    return await prisma.order.count({
      where: { userId, status: { in: [...ORDER_PAID_PURCHASE_STATUSES] } },
    });
  }
}

function coerceCustomizationSnapshot(
  value: unknown,
): CustomizationSnapshot[] | null {
  if (value === null || value === Prisma.JsonNull) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => coerceCustomizationSnapshotItem(entry))
      .filter((entry): entry is CustomizationSnapshot => entry !== null);
  }

  const snapshot = coerceCustomizationSnapshotItem(value);
  return snapshot ? [snapshot] : null;
}

function coerceCustomizationSnapshotItem(
  value: unknown,
): CustomizationSnapshot | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  return {
    id: value.id,
    text: normalizeNullableString(value.text),
    color: normalizeNullableString(value.color),
    size: normalizeNullableString(value.size),
    imageUrl: normalizeNullableString(value.imageUrl),
    designPosition: coerceDesignPosition(value.designPosition),
  };
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function mapOrderLineItem(item: {
  id: string;
  orderId: string;
  productId: string;
  productName?: string | null;
  productImageUrl?: string | null;
  product?: {
    translations?: Array<{ name?: string | null }>;
    images?: Array<{ url: string }>;
  } | null;
  unitPrice: unknown;
  quantity: number;
  customizationIdList: string[];
  customizationSnapshot: unknown;
}) {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName:
      item.product?.translations?.[0]?.name ?? item.productName ?? undefined,
    productImageUrl: item.product?.images?.[0]?.url ?? item.productImageUrl,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    customizationIdList: item.customizationIdList,
    customizationSnapshot: coerceCustomizationSnapshot(
      item.customizationSnapshot,
    ),
  };
}
