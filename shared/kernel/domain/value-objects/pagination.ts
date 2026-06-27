/**
 * Types-only pagination envelope.
 *
 * Lives in `shared/kernel/domain/value-objects` because it is a pure,
 * logic-free data shape reused across modules. It carries zero business
 * rules and therefore does not violate the Modular Monolith boundary
 * (that rule forbids shared query *logic*, not shared *types*).
 */
export interface PaginatedResult<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export const PaginationDefaults = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortDir: 'desc',
} as const;
