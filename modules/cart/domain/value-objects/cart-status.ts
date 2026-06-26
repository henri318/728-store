/**
 * Cart lifecycle status (spec REQ-CART-003).
 *
 * - ACTIVE: open, editable (add, update, remove, checkout).
 * - CHECKED_OUT: committed, immutable. Reached only via CheckoutCart.
 */
export enum CartStatus {
  Active = 'ACTIVE',
  CheckedOut = 'CHECKED_OUT',
}
