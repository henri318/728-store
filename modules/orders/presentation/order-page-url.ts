export interface OrderPageFilter {
  status: string;
  sortDir: string;
  pageSize: number;
  q?: string;
}

export function buildOrderPageUrl(
  locale: string,
  basePath: '/orders' | '/seller/orders',
  filter: OrderPageFilter,
  page: number,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (filter.status !== 'all') params.set('status', filter.status);
  if (filter.sortDir !== 'desc') params.set('sortDir', filter.sortDir);
  if (filter.pageSize !== 20) params.set('pageSize', String(filter.pageSize));
  if (filter.q) params.set('q', filter.q);
  const qs = params.toString();
  return qs ? `/${locale}${basePath}?${qs}` : `/${locale}${basePath}`;
}
