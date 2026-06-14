import { eventBus } from '@/shared/kernel/event-bus';

/**
 * Global event registry for the e-commerce platform.
 * 
 * This constant defines all domain events used across modules for inter-module communication.
 * Events follow the pattern '{domain}.{action}' and are used with the EventBus for pub/sub messaging.
 * 
 * Event Categories:
 * - User Events: user.registered
 * - Order Events: order.created, order.paid, order.ready-for-production
 * - Payment Events: payment.completed
 * - Product Events: product-customization.created
 * 
 * @example
 * ```typescript
 * // Emit an event
 * emitEvent(GlobalEvents.ORDER_PAID, { orderId: '123', amount: 99.99 });
 * 
 * // Subscribe to an event
 * onEvent(GlobalEvents.ORDER_PAID, (data) => {
 *   console.log('Order paid:', data);
 * });
 * ```
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

/**
 * Emits a global event with the provided data payload.
 * 
 * @param event - The event name from GlobalEvents
 * @param data - The event payload (must be JSON-serializable)
 * 
 * @example
 * ```typescript
 * emitEvent(GlobalEvents.ORDER_PAID, {
 *   orderId: 'order-123',
 *   userId: 'user-456',
 *   amount: 99.99
 * });
 * ```
 */
export const emitEvent = (event: GlobalEventName, data: any) => eventBus.emit(event, data);

/**
 * Subscribes to a global event with a handler function.
 * 
 * @param event - The event name from GlobalEvents
 * @param handler - Callback function invoked when the event is emitted
 * 
 * @example
 * ```typescript
 * onEvent(GlobalEvents.PAYMENT_COMPLETED, (data) => {
 *   console.log('Payment completed for order:', data.orderId);
 * });
 * ```
 */
export const onEvent = (event: GlobalEventName, handler: (data: any) => void) => eventBus.on(event, handler);
