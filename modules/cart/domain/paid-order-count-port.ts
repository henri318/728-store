/**
 * PaidOrderCountPort — cart's port for checking if the user has any
 * paid orders (drives the first-purchase discount, spec REQ-CART-016).
 *
 * The orders module is the source of truth for paid order history. The
 * cart module never imports from orders directly; an orders-side adapter
 * implements this port and is wired in the composition root.
 */
export interface PaidOrderCountPort {
  /** Returns the number of orders in PAID status for the user. */
  countPaidOrdersByUserId(userId: string): Promise<number>;
}
