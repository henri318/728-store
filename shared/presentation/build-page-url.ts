interface PageUrlOptions {
  q?: string;
  pageSize?: number;
  defaultPageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

export function buildPageUrl(
  basePath: string,
  page: number,
  options: PageUrlOptions = {},
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (options.q) params.set('q', options.q);
  if (options.pageSize && options.pageSize !== options.defaultPageSize) {
    params.set('pageSize', String(options.pageSize));
  }
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortDir) params.set('sortDir', options.sortDir);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
