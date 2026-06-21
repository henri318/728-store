/**
 * SellerStatus — the valid lifecycle states for a seller.
 *
 * Transitions are enforced by the domain layer. A banned seller is terminal:
 * no further transitions are allowed. Same-status transitions are no-ops
 * handled by the use case, not the transition map.
 */
export enum SellerStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

/**
 * Maps each non-terminal status to the list of statuses it can transition TO.
 * A missing key means the status is terminal (no outgoing transitions).
 *
 * Rules:
 *  - active   → suspended, banned
 *  - suspended → active, banned
 *  - banned   → (none — terminal state, no key in map)
 */
export const VALID_TRANSITIONS: Partial<Record<SellerStatus, SellerStatus[]>> =
  {
    [SellerStatus.ACTIVE]: [SellerStatus.SUSPENDED, SellerStatus.BANNED],
    [SellerStatus.SUSPENDED]: [SellerStatus.ACTIVE, SellerStatus.BANNED],
  };
