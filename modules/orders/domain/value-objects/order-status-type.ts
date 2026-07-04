import type { OrderLifecycleStatus } from './order-lifecycle';

/**
 * Valid status values for an order in its lifecycle.
 * The fulfillment model is: new -> in_progress -> completed.
 *
 * Legacy values remain in the union so older tests and adapters still
 * type-check while the transition is completed.
 */
export type OrderStatus =
  | OrderLifecycleStatus
  | 'pending'
  | 'paid'
  | 'ready-for-production'
  | 'cancelled';
