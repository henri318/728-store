/**
 * ProductEvents — domain event constants for the product lifecycle.
 *
 * Follows the SellerEvents pattern: module-local const object with
 * 'module.event' string values. Registered in GlobalEvents for
 * cross-module consumption via the EventBus.
 *
 * Events persist via the OutboxRepository in the same transaction
 * as the business change.
 */
export const ProductEvents = {
  /** Emitted when a new product is created (initial status: DRAFT or ACTIVE). */
  PRODUCT_CREATED: 'product.created',
  /** Emitted when a product's profile or fields are updated. */
  PRODUCT_UPDATED: 'product.updated',
  /** Emitted when a product is published (DRAFT → ACTIVE). */
  PRODUCT_PUBLISHED: 'product.published',
  /** Emitted when a product is archived (ACTIVE → ARCHIVED). */
  PRODUCT_ARCHIVED: 'product.archived',
} as const;
