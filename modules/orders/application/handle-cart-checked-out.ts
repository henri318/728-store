import type { OrderRepository, OrderEntity } from '../domain/order-repository';
import type { OrderLineItemEntity } from '../domain/entities/order-line-item';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';

// --- Payload shape (matches the CART_CHECKED_OUT event from cart) ---

export interface CartLineSnapshot {
  productId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  customizationIdList?: string[];
}

export interface CartCheckedOutPayload {
  cartId: string;
  userId: string;
  items: CartLineSnapshot[];
  subtotal: number;
  discountApplied: number;
  shippingCost: number;
  totalAmount: number;
  currency: 'EUR';
  isFirstPurchase: boolean;
  occurredAt: string;
}

// --- Use Case ---

/**
 * HandleCartCheckedOut — handler subscribed to CART_CHECKED_OUT.
 *
 * Spec REQ-ORD-001 / REQ-ORD-002:
 *  - Groups the payload's items by sellerId.
 *  - Creates one Order per seller, each with its own OrderLineItems.
 *  - Emits ORDER_CREATED per order.
 *  - Idempotent: dedupes by cartId via OrderRepository.findIdsByCartId.
 *    A second delivery for the same cartId is a no-op.
 *  - Customization fields are preserved on every line item.
 */
export class HandleCartCheckedOut {
  constructor(
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(payload: CartCheckedOutPayload): Promise<void> {
    // Idempotency guard: if any order already references this cart,
    // the handler has already run for this delivery — skip silently.
    const existing = await this.orderRepository.findIdsByCartId(payload.cartId);
    if (existing.length > 0) return;

    // Group items by sellerId, preserving the input order within each group.
    const groups = new Map<string, CartLineSnapshot[]>();
    for (const item of payload.items) {
      const existing = groups.get(item.sellerId) ?? [];
      existing.push(item);
      groups.set(item.sellerId, existing);
    }

    // Create one order per seller.
    for (const [sellerId, items] of groups) {
      const orderId = crypto.randomUUID();

      const lineItems: OrderLineItemEntity[] = items.map((it) => ({
        id: crypto.randomUUID(),
        orderId,
        productId: it.productId,
        quantity: it.quantity,
        customizationIdList: it.customizationIdList ?? [],
        customizationSnapshot: null,
      }));

      const total = items.reduce(
        (acc, it) => acc + it.unitPrice * it.quantity,
        0,
      );

      const order: OrderEntity = {
        id: orderId,
        userId: payload.userId,
        sellerId,
        total,
        status: 'pending',
        cartId: payload.cartId,
      };

      const saved = await this.orderRepository.save(order);
      await this.orderRepository.saveOrderLineItems(saved.id, lineItems);

      // ORDER_CREATED payload (spec REQ-ORD-002): every downstream
      // consumer (production, shipping, notifications) needs the
      // line-item breakdown, not just the totals, so emit items[] too.
      const orderCreatedAt = new Date();
      await this.outboxRepository.saveEvent(GlobalEvents.ORDER_CREATED, {
        orderId: saved.id,
        userId: saved.userId,
        sellerId: saved.sellerId,
        total: Number(saved.total),
        totalAmount: Number(saved.total),
        items: lineItems.map((li) => ({
          productId: li.productId,
          quantity: li.quantity,
          unitPrice:
            items.find((it) => it.productId === li.productId)?.unitPrice ?? 0,
        })),
        occurredAt: orderCreatedAt.toISOString(),
      });
    }
  }

  /**
   * Static helper that wires the handler to a CART_CHECKED_OUT listener
   * on the event bus. Mirrors the pattern used by MarkAsPaidUseCase
   * and AssignToProductionUseCase (events/domain/event-bus-port).
   */
  static subscribe(
    eventBus: EventBusPort,
    useCase: HandleCartCheckedOut,
  ): void {
    eventBus.on(GlobalEvents.CART_CHECKED_OUT, async (data: unknown) => {
      try {
        await useCase.execute(data as CartCheckedOutPayload);
      } catch (error) {
        console.error('Error processing CartCheckedOut event:', error);
      }
    });
  }
}
