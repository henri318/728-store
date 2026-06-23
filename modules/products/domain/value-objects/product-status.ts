/**
 * ProductStatus — the valid lifecycle states for a product.
 *
 * Follows the SellerStatus pattern exactly:
 *  - Enum with string values
 *  - VALID_TRANSITIONS map for state machine enforcement
 *  - ARCHIVED is terminal (no outgoing transitions)
 *  - Same-status transitions are no-ops (handled by use case)
 */
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Maps each non-terminal status to the list of statuses it can transition TO.
 * A missing key means the status is terminal (no outgoing transitions).
 *
 * Rules:
 *  - DRAFT   → [ACTIVE]           (must publish before archiving)
 *  - ACTIVE  → [ARCHIVED]         (can archive directly)
 *  - ARCHIVED → (none — terminal)  (no further transitions)
 */
export const VALID_TRANSITIONS: Partial<
  Record<ProductStatus, ProductStatus[]>
> = {
  [ProductStatus.DRAFT]: [ProductStatus.ACTIVE],
  [ProductStatus.ACTIVE]: [ProductStatus.ARCHIVED],
};
