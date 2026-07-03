/**
 * ProductSearchExecutedPayload — the shape carried by the
 * PRODUCT_SEARCH_EXECUTED event.
 *
 * Consumed by HandleProductSearchExecuted (in the application layer)
 * which is subscribed to the in-process event bus. The subscriber
 * no-ops when `userId` is null — guests never produce a SearchHistory
 * row, and crucially, no browser storage is written for them either.
 */
export interface ProductSearchExecutedPayload {
  readonly userId: string | null;
  readonly term: string;
  readonly locale: string;
  readonly occurredAt: string;
}
