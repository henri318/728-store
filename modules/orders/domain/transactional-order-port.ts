/**
 * TransactionalOrderPort — the seam between the orders use cases and the
 * concrete transactional service that wraps the Prisma transaction.
 *
 * Use cases depend on this port, NOT on `TransactionalOrderService`
 * directly. The service implements this port in
 * `../infrastructure/transactional-order-service.ts`.
 *
 * Why this exists: use cases must not import from `../infrastructure/`.
 * Extracting the port keeps that boundary clean while still letting the
 * orders module own its transaction semantics.
 */
export interface TransactionalOrderPort {
  /**
   * Atomically:
   *  1. Pre-flight check: look up the order via the OrderRepository port
   *  2. Update the order status inside a Prisma transaction
   *  3. Record the outbox event in the same transaction (via the
   *     OutboxRepository with the tx client)
   *
   * Throws if the order does not exist or the update fails.
   */
  updateStatusAndEmit(
    orderId: string,
    newStatus: string,
    eventType: string,
    eventPayload: Record<string, unknown>,
  ): Promise<void>;
}
