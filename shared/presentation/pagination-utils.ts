export function computePaginationState(result: {
  items: unknown[];
  page: number;
  totalPages: number;
}) {
  return {
    hasItems: result.items.length > 0,
    currentPage:
      result.totalPages > 0 && result.page > result.totalPages
        ? result.totalPages
        : result.page,
  };
}
