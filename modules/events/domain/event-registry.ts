/**
 * Global event registry for the e-commerce platform.
 *
 * Pure constant — no imports. Lives in the events module's domain layer
 * so it can be consumed by use cases, tests, and the event bus itself
 * without any adapter coupling.
 */
export const GlobalEvents = {
  /** User registration completed */
  USER_REGISTERED: 'user.registered',
  /** User profile fields updated (firstName, lastName, address) */
  USER_UPDATED: 'user.updated',
  /** Role assigned to a user */
  ROLE_ASSIGNED: 'role.assigned',
  /** Order created and pending payment */
  ORDER_CREATED: 'order.created',
  /** Order payment completed - emitted by orders module */
  ORDER_PAID: 'order.paid',
  /** Order ready for production - emitted when all customizations confirmed */
  ORDER_READY_FOR_PRODUCTION: 'order.ready-for-production',
  /** Payment completed in payments module - triggers order mark-as-paid */
  PAYMENT_COMPLETED: 'payment.completed',
  /** Product customization created - triggers production readiness check */
  PRODUCT_CUSTOMIZATION_CREATED: 'product-customization.created',
  /** New role created in the role catalog */
  ROLE_CREATED: 'role.created',
  /** User account deleted */
  USER_DELETED: 'user.deleted',
  /** Password changed by authenticated user */
  PASSWORD_CHANGED: 'password.changed',
  /** Password reset via forgot-password flow */
  PASSWORD_RESET: 'password.reset',
  /** New seller created (initial status: active) */
  SELLER_CREATED: 'seller.created',
  /** Seller profile (name, description) updated */
  SELLER_UPDATED: 'seller.updated',
  /** Seller soft-deleted (deletedAt set) */
  SELLER_DELETED: 'seller.deleted',
  /** Seller status changed (active ↔ suspended → banned) */
  SELLER_STATUS_CHANGED: 'seller.status-changed',
  /** New product created (initial status: DRAFT or ACTIVE) */
  PRODUCT_CREATED: 'product.created',
  /** Product profile or fields updated */
  PRODUCT_UPDATED: 'product.updated',
  /** Product published (DRAFT → ACTIVE) */
  PRODUCT_PUBLISHED: 'product.published',
  /** Product archived (ACTIVE → ARCHIVED) */
  PRODUCT_ARCHIVED: 'product.archived',
  /** File uploaded and confirmed */
  FILE_UPLOADED: 'file.uploaded',
  /** File deleted from storage */
  FILE_DELETED: 'file.deleted',
  /** Cart checked out by user — triggers order creation in Orders module */
  CART_CHECKED_OUT: 'cart.checked-out',
  /** Guest cart migrated to server cart on login */
  GUEST_CART_MIGRATED: 'cart.guest-migrated',
  /** New cart created (initial add or guest migration create path) */
  CART_CREATED: 'cart.created',
  /** Item added to a cart */
  CART_ITEM_ADDED: 'cart.item-added',
  /** Item quantity updated */
  CART_ITEM_UPDATED: 'cart.item-updated',
  /** Item removed from a cart */
  CART_ITEM_REMOVED: 'cart.item-removed',
} as const;

/**
 * Type representing all possible global event names.
 * Derived from the GlobalEvents constant values.
 */
export type GlobalEventName = (typeof GlobalEvents)[keyof typeof GlobalEvents];
