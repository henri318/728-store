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
} as const;

/**
 * Type representing all possible global event names.
 * Derived from the GlobalEvents constant values.
 */
export type GlobalEventName = typeof GlobalEvents[keyof typeof GlobalEvents];
