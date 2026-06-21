/**
 * SellerEvents — domain event constants for the seller lifecycle.
 *
 * These events are persisted via the OutboxRepository in the same
 * transaction as the business change. The OutboxWorker later dispatches
 * them to the EventBus for cross-module consumption.
 */
export const SellerEvents = {
  /** Emitted when a new seller is created (initial status: active). */
  SELLER_CREATED: 'seller.created',
  /** Emitted when a seller's profile (name, description) is updated. */
  SELLER_UPDATED: 'seller.updated',
  /** Emitted when a seller is soft-deleted (deletedAt set). */
  SELLER_DELETED: 'seller.deleted',
  /** Emitted when a seller's status changes (includes previous and new status). */
  SELLER_STATUS_CHANGED: 'seller.status-changed',
} as const;
