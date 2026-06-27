import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/infrastructure/prisma';
import type { CartRepository } from '../domain/cart-repository';
import type { CartEntity } from '../domain/entities/cart';
import type { CartItemEntity } from '../domain/entities/cart-item';
import { CartId } from '../domain/value-objects/cart-id';
import { CartItemId } from '../domain/value-objects/cart-item-id';
import { CartStatus } from '../domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { CartAlreadyActiveError } from '../domain/errors';

/**
 * PrismaCartRepository — the production adapter for CartRepository.
 *
 * Converts between the domain value objects (CartId, CartItemId, ProductId,
 * SellerId, Money, CartStatus) and Prisma's primitives at the persistence
 * boundary. No other layer is allowed to touch Prisma.Decimal — Money is
 * the single point of truth for monetary amounts.
 *
 * Atomic operations (status update + outbox write) are wrapped by the
 * caller in `prisma.$transaction` and the `tx` client is passed to
 * `save()` and `markCheckedOut()` to keep the same transactional scope.
 */
export class PrismaCartRepository implements CartRepository {
  async findActiveByUserId(userId: string): Promise<CartEntity | null> {
    const row = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.Active },
      include: { items: true },
    });
    return row ? toDomain(row) : null;
  }

  async findById(cartId: CartId): Promise<CartEntity | null> {
    const row = await prisma.cart.findUnique({
      where: { id: cartId.value },
      include: { items: true },
    });
    return row ? toDomain(row) : null;
  }

  async save(cart: CartEntity): Promise<CartEntity> {
    // Enforce spec REQ-CART-001: at most one ACTIVE cart per user.
    // The database partial unique index `Cart_userId_active_unique` is
    // the source of truth — the adapter translates Prisma's P2002 error
    // into CartAlreadyActiveError so the application layer can speak
    // domain types.
    try {
      // Upsert the cart row.
      await prisma.cart.upsert({
        where: { id: cart.id },
        update: {
          userId: cart.userId,
          status: cart.status,
          updatedAt: cart.updatedAt,
        },
        create: {
          id: cart.id,
          userId: cart.userId,
          status: cart.status,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        },
      });

      // Replace items wholesale: delete then re-insert. This is the
      // simplest correct semantics for a "save the whole cart" port and
      // matches how the in-memory double works.
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (cart.items.length > 0) {
        await prisma.cartItem.createMany({
          data: cart.items.map((item) => ({
            id: item.id,
            cartId: cart.id,
            productId: item.productId.value,
            sellerId: item.sellerId.value,
            quantity: item.quantity,
            unitPriceSnapshot: new Prisma.Decimal(
              item.unitPriceSnapshot.amount,
            ),
            customizationIdList: item.customizationIdList,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      }

      const saved = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });
      if (!saved) {
        throw new Error(`Cart ${cart.id} not found after save`);
      }
      return toDomain(saved);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Unique constraint violation — most likely the partial
        // unique index `Cart_userId_active_unique`.
        throw new CartAlreadyActiveError(
          `User ${cart.userId} already has an active cart`,
        );
      }
      throw err;
    }
  }

  async markCheckedOut(cartId: CartId, tx?: unknown): Promise<void> {
    const target = cartId.value;
    // The Prisma adapter accepts an optional transaction client so the
    // checkout flow can compose this status update with the outbox
    // write in a single atomic unit (Transactional Outbox Pattern).
    const client = (tx ?? prisma) as typeof prisma;
    const existing = await client.cart.findUnique({ where: { id: target } });
    if (!existing) return;
    await client.cart.update({
      where: { id: target },
      data: { status: CartStatus.CheckedOut, updatedAt: new Date() },
    });
  }

  async deleteItem(itemId: CartItemId): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { id: itemId.value } });
  }

  async findItemById(itemId: CartItemId): Promise<CartItemEntity | null> {
    const row = await prisma.cartItem.findUnique({
      where: { id: itemId.value },
    });
    return row ? toItemDomain(row) : null;
  }

  async findItemsByCartId(cartId: CartId): Promise<CartItemEntity[]> {
    const rows = await prisma.cartItem.findMany({
      where: { cartId: cartId.value },
    });
    return rows.map(toItemDomain);
  }
}

// --- Mapping helpers ---

type PrismaCartWithItems = {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'CHECKED_OUT';
  createdAt: Date;
  updatedAt: Date;
  items: PrismaCartItemRow[];
};

type PrismaCartItemRow = {
  id: string;
  cartId: string;
  productId: string;
  sellerId: string;
  quantity: number;
  unitPriceSnapshot: Prisma.Decimal | number;
  customizationIdList: string[];
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(row: PrismaCartWithItems): CartEntity {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as CartStatus,
    items: row.items.map(toItemDomain),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItemDomain(row: PrismaCartItemRow): CartItemEntity {
  const amount =
    row.unitPriceSnapshot instanceof Prisma.Decimal
      ? row.unitPriceSnapshot.toNumber()
      : Number(row.unitPriceSnapshot);
  return {
    id: row.id,
    cartId: row.cartId,
    productId: ProductId.create(row.productId),
    sellerId: SellerId.create(row.sellerId),
    quantity: row.quantity,
    unitPriceSnapshot: Money.create(amount, Currency.EUR),
    customizationIdList: row.customizationIdList,
  };
}
