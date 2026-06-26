import type { OrderRepository } from '../domain/order-repository';
import type { PaidOrderCountPort } from '@/modules/cart/domain/paid-order-count-port';

/**
 * PrismaPaidOrderCountAdapter — bridges cart's PaidOrderCountPort to the
 * orders module's OrderRepository.
 *
 * The cart module needs to know if a user has any paid orders to determine
 * whether the first-purchase discount applies (spec REQ-CART-016). The orders
 * module is the source of truth for paid order history. This adapter implements
 * the cart's port by delegating to the orders repository.
 *
 * The orders repository is injected via constructor so the adapter stays
 * testable and free of infrastructure imports.
 */
export class PrismaPaidOrderCountAdapter implements PaidOrderCountPort {
  constructor(private readonly orderRepository: OrderRepository) {}

  async countPaidOrdersByUserId(userId: string): Promise<number> {
    return await this.orderRepository.countPaidByUserId(userId);
  }
}
