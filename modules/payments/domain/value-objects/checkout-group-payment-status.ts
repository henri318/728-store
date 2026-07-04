export const CHECKOUT_GROUP_PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type CheckoutGroupPaymentStatus =
  (typeof CHECKOUT_GROUP_PAYMENT_STATUSES)[keyof typeof CHECKOUT_GROUP_PAYMENT_STATUSES];
