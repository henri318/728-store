export const ORDER_LIFECYCLE_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const ORDER_PAID_PURCHASE_STATUSES = [
  ORDER_LIFECYCLE_STATUSES.COMPLETED,
  'paid',
];

export type OrderLifecycleStatus =
  (typeof ORDER_LIFECYCLE_STATUSES)[keyof typeof ORDER_LIFECYCLE_STATUSES];

export const ORDER_LIFECYCLE_TRANSITIONS: Record<
  OrderLifecycleStatus,
  readonly OrderLifecycleStatus[]
> = {
  [ORDER_LIFECYCLE_STATUSES.NEW]: [ORDER_LIFECYCLE_STATUSES.IN_PROGRESS],
  [ORDER_LIFECYCLE_STATUSES.IN_PROGRESS]: [ORDER_LIFECYCLE_STATUSES.COMPLETED],
  [ORDER_LIFECYCLE_STATUSES.COMPLETED]: [],
};

export function canTransitionOrderStatus(
  from: OrderLifecycleStatus,
  to: OrderLifecycleStatus,
): boolean {
  return ORDER_LIFECYCLE_TRANSITIONS[from].includes(to);
}
