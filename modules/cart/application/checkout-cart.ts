import type { CartRepository } from '../domain/cart-repository';
import type { ProductRepository } from '../domain/product-repository';
import type { PaidOrderCountPort } from '../domain/paid-order-count-port';
import { CartId } from '../domain/value-objects/cart-id';
import { CartStatus } from '../domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import {
  CartNotFoundError,
  CartImmutableError,
  EmptyCartError,
  PriceChangedError,
  type PriceChange,
} from '../domain/errors';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartEntity } from '../domain/entities/cart';
import type { CartItemEntity } from '../domain/entities/cart-item';

// --- Constants (spec REQ-CART-016) ---

/** Flat shipping cost for any checkout. */
const FLAT_SHIPPING_EUR = 3.99;
/** First-purchase discount rate (10% of subtotal). */
const FIRST_PURCHASE_DISCOUNT_RATE = 0.1;

// --- DTOs / result types ---

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: Currency;
  isFirstPurchase: boolean;
}

export interface CheckoutPreview {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: Currency;
  isFirstPurchase: boolean;
}

export interface CheckoutResult {
  cart: CartEntity;
  totals: CheckoutTotals;
  eventPayload: Record<string, unknown>;
  orderIds: string[];
}

// --- Use Case ---

/**
 * CheckoutCart — two-step checkout flow (spec REQ-CART-014 / REQ-CART-016).
 *
 *  preview(userId)
 *      - Read-only: validates current prices against the cart's snapshots.
 *      - Returns totals. If prices changed since the user added items,
 *        throws PriceChangedError with `priceChanges[]` so the API can
 *        surface a 409 with the diff.
 *      - Never mutates state and never emits events.
 *
 *  confirm(userId, acceptPriceChanges)
 *      - Atomically:
 *          1. Mark the cart CHECKED_OUT
 *          2. Emit CART_CHECKED_OUT with the snapshot payload
 *      - The status update and the outbox write run inside a single
 *        `transactionRunner.run()` callback so the database never holds
 *        a CHECKED_OUT cart without its CART_CHECKED_OUT event (and vice
 *        versa) — this is the Transactional Outbox Pattern (REQ-CART-022).
 *      - The actual Order creation is the Orders module's job (handled
 *        by HandleCartCheckedOut subscribed to CART_CHECKED_OUT).
 *      - `acceptPriceChanges=true` updates each item's unitPriceSnapshot
 *        to the current product price before locking the cart.
 *
 * The use case depends only on ports (CartRepository, ProductRepository,
 * OutboxRepository, PaidOrderCountPort, TransactionRunner). The Prisma
 * adapter passes the same `tx` client to the cart write and the outbox
 * write so they commit or roll back together.
 */
export class CheckoutCart {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
    private paidOrderCountPort: PaidOrderCountPort,
    private transactionRunner: TransactionRunner,
  ) {}

  async preview(userId: string): Promise<CheckoutPreview> {
    const { cart, totals } = await this.buildTotals(userId, false);
    // Touch the unused cart ref so TS doesn't complain about a return-only
    // branch — the spec ties the preview to the cart's contents and we
    // want the call to also serve as a validation gate.
    void cart;
    return totals;
  }

  async confirm(
    userId: string,
    acceptPriceChanges: boolean,
  ): Promise<CheckoutResult> {
    const { cart, totals, priceChanges } = await this.buildTotals(
      userId,
      acceptPriceChanges,
    );

    // Build the event payload. Each item carries the live snapshot
    // (already updated if `acceptPriceChanges` was true).
    const itemsPayload = cart.items.map((item) => ({
      productId: item.productId.value,
      sellerId: item.sellerId.value,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot.amount,
      customizationIdList: item.customizationIdList,
    }));

    const eventPayload: Record<string, unknown> = {
      cartId: cart.id,
      userId: cart.userId,
      items: itemsPayload,
      subtotal: totals.subtotal,
      discountApplied: totals.discount,
      shippingCost: totals.shipping,
      totalAmount: totals.total,
      currency: 'EUR',
      isFirstPurchase: totals.isFirstPurchase,
      occurredAt: new Date().toISOString(),
    };

    // Mark the cart as CHECKED_OUT and emit CART_CHECKED_OUT in a single
    // atomic unit of work (Transactional Outbox Pattern, REQ-CART-022).
    // If either write fails, both are rolled back so the database never
    // holds a CHECKED_OUT cart without its corresponding outbox event.
    await this.transactionRunner.run(async (tx) => {
      await this.cartRepository.markCheckedOut(CartId.create(cart.id), tx);
      await this.outboxRepository.saveEvent(
        GlobalEvents.CART_CHECKED_OUT,
        eventPayload,
        tx,
      );
    });

    // The Orders module is responsible for creating one Order per
    // seller. It subscribes to CART_CHECKED_OUT and emits ORDER_CREATED
    // per seller. The use case returns an empty list — the API can
    // poll the orders endpoint after the redirect to surface the ids.
    return {
      cart: { ...cart, status: CartStatus.CheckedOut },
      totals,
      eventPayload,
      orderIds: [],
      // priceChanges is included for API responses that want to log
      // the diff alongside the result (not part of the public response).
      // Keep the linter happy when the value is empty.
      ...(priceChanges.length > 0 ? { priceChanges } : {}),
    } as CheckoutResult & { priceChanges?: PriceChange[] };
  }

  // --- internals ---

  /**
   * Loads the cart, fetches the current product prices, computes
   * totals, and (optionally) updates snapshots. Returns the cart
   * (with updated snapshots when `acceptPriceChanges` is true) and
   * the computed totals. Throws PriceChangedError on price drift
   * when `acceptPriceChanges` is false.
   */
  private async buildTotals(
    userId: string,
    acceptPriceChanges: boolean,
  ): Promise<{
    cart: CartEntity;
    totals: CheckoutTotals;
    priceChanges: PriceChange[];
  }> {
    const cart = await this.cartRepository.findActiveByUserId(userId);
    if (!cart) {
      throw new CartNotFoundError(
        `No active cart for user ${userId}`,
        `No active cart found`,
      );
    }
    if (cart.status !== CartStatus.Active) {
      throw new CartImmutableError(
        `Cart ${cart.id} is not editable (status=${cart.status})`,
      );
    }
    if (cart.items.length === 0) {
      throw new EmptyCartError();
    }

    // Fetch current prices for every distinct product in the cart.
    const productIds = uniqueProductIds(cart.items);
    const current = await this.productRepository.findByIds(productIds);

    const priceChanges: PriceChange[] = [];
    const updatedItems: CartItemEntity[] = cart.items.map((item) => {
      const snap = current.get(item.productId.value);
      if (!snap) {
        // The product disappeared from the catalog — treat as price
        // change to (zero?) — for now, surface a price change with
        // newPrice=0 to force the user to re-confirm.
        priceChanges.push({
          itemId: item.id,
          oldPrice: item.unitPriceSnapshot,
          newPrice: Money.create(0, Currency.EUR),
        });
        return item;
      }
      if (snap.basePrice !== item.unitPriceSnapshot.amount) {
        const change: PriceChange = {
          itemId: item.id,
          oldPrice: item.unitPriceSnapshot,
          newPrice: Money.create(snap.basePrice, Currency.EUR),
        };
        priceChanges.push(change);
        if (acceptPriceChanges) {
          // Update the snapshot to the current price.
          return {
            ...item,
            unitPriceSnapshot: Money.create(snap.basePrice, Currency.EUR),
          };
        }
      }
      return item;
    });

    if (priceChanges.length > 0 && !acceptPriceChanges) {
      throw new PriceChangedError(
        `${priceChanges.length} item(s) have a different price than when added`,
        priceChanges,
      );
    }

    // Persist the updated snapshots (if any) so the cart reflects the
    // new prices. Status stays ACTIVE — checkout hasn't run yet.
    let liveCart = cart;
    if (acceptPriceChanges && priceChanges.length > 0) {
      liveCart = await this.cartRepository.save({
        ...cart,
        items: updatedItems,
        updatedAt: new Date(),
      });
    }

    // Compute totals from the live items (so acceptPriceChanges reflects
    // the updated snapshot prices in subtotal/discount/total).
    const subtotal = round2(
      liveCart.items.reduce(
        (acc, i) => acc + i.unitPriceSnapshot.amount * i.quantity,
        0,
      ),
    );
    const paidOrderCount =
      await this.paidOrderCountPort.countPaidOrdersByUserId(userId);
    const isFirstPurchase = paidOrderCount === 0;
    const discount = isFirstPurchase
      ? round2(subtotal * FIRST_PURCHASE_DISCOUNT_RATE)
      : 0;
    const shipping = FLAT_SHIPPING_EUR;
    const total = round2(subtotal - discount + shipping);

    return {
      cart: liveCart,
      totals: {
        subtotal,
        discount,
        shipping,
        total,
        currency: Currency.EUR,
        isFirstPurchase,
      },
      priceChanges,
    };
  }
}

// --- helpers ---

function uniqueProductIds(items: CartItemEntity[]): ProductId[] {
  const set = new Set<string>();
  const out: ProductId[] = [];
  for (const item of items) {
    if (!set.has(item.productId.value)) {
      set.add(item.productId.value);
      out.push(item.productId);
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
