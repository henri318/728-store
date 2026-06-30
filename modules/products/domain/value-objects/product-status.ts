/**
 * ProductStatus — the valid lifecycle states for a product.
 *
 * Follows the SellerStatus pattern exactly:
 *  - Enum with string values
 *  - VALID_TRANSITIONS map for state machine enforcement
 *  - ELIMINATED is terminal (no outgoing transitions)
 *  - Same-status transitions are no-ops (handled by use case)
 */
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  ELIMINATED = 'ELIMINATED',
}

/**
 * Maps each non-terminal status to the list of statuses it can transition TO.
 * A missing key means the status is terminal (no outgoing transitions).
 *
 * Rules:
 *  - DRAFT   → [ACTIVE, ELIMINATED]       (can publish or delete)
 *  - ACTIVE  → [ARCHIVED, ELIMINATED]     (can suspend or delete)
 *  - ARCHIVED → [ACTIVE, ELIMINATED]      (can reactivate or delete)
 *  - ELIMINATED → (none — terminal)       (no further transitions)
 */
export const VALID_TRANSITIONS: Readonly<
  Partial<Record<ProductStatus, readonly ProductStatus[]>>
> = Object.freeze({
  [ProductStatus.DRAFT]: Object.freeze([
    ProductStatus.ACTIVE,
    ProductStatus.ELIMINATED,
  ]),
  [ProductStatus.ACTIVE]: Object.freeze([
    ProductStatus.ARCHIVED,
    ProductStatus.ELIMINATED,
  ]),
  [ProductStatus.ARCHIVED]: Object.freeze([
    ProductStatus.ACTIVE,
    ProductStatus.ELIMINATED,
  ]),
});
