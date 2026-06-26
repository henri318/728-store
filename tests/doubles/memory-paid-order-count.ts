import type { PaidOrderCountPort } from '@/modules/cart/domain/paid-order-count-port';

/**
 * In-memory PaidOrderCountPort test double.
 *
 * Tests call `setCount(n)` to simulate a user with n paid orders and
 * therefore control whether the first-purchase discount applies
 * (spec REQ-CART-016).
 */
export class MemoryPaidOrderCount implements PaidOrderCountPort {
  private count = 0;

  async countPaidOrdersByUserId(_userId: string): Promise<number> {
    return this.count;
  }

  setCount(n: number): void {
    this.count = n;
  }
}
