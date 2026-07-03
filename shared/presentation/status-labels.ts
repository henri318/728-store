export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'status_draft',
  ACTIVE: 'status_active',
  ARCHIVED: 'status_archived',
  ELIMINATED: 'status_eliminated',
};

export const SELLER_STATUS_LABELS: Record<string, string> = {
  active: 'status_active',
  suspended: 'status_suspended',
  banned: 'status_banned',
};

export function resolveStatusLabel(
  status: string,
  map: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dict: Record<string, any>,
  fallback = status,
): string {
  const key =
    map[status] ?? map[status.toLowerCase()] ?? map[status.toUpperCase()];
  return key && dict[key] ? dict[key] : fallback;
}
