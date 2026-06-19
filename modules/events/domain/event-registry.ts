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
} as const;

/**
 * Type representing all possible global event names.
 * Derived from the GlobalEvents constant values.
 */
export type GlobalEventName = typeof GlobalEvents[keyof typeof GlobalEvents];
