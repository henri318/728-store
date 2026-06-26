import type { CartItemEntity } from './cart-item';
import { CartStatus } from '../value-objects/cart-status';

/**
 * Cart aggregate root.
 *
 * Holds a snapshot of the items that belong to a single user. A user has
 * at most one ACTIVE cart at a time (spec REQ-CART-001).
 */
export interface CartEntity {
  /** Unique identifier */
  id: string;
  /** FK to the owning User */
  userId: string;
  /** Lifecycle status — ACTIVE or CHECKED_OUT */
  status: CartStatus;
  /** Items currently in the cart (empty allowed while ACTIVE) */
  items: CartItemEntity[];
  /** When the cart was first created */
  createdAt: Date;
  /** Updated on every mutation */
  updatedAt: Date;
}
