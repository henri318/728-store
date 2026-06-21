/**
 * Valid status values for an order in its lifecycle.
 * - pending: Order created, awaiting payment
 * - paid: Payment completed, awaiting production
 * - ready-for-production: All customizations confirmed, ready to manufacture
 * - completed: Order fulfilled and delivered
 * - cancelled: Order cancelled by user or system
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'ready-for-production'
  | 'completed'
  | 'cancelled';
