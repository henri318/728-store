import { describe, it, expect } from 'vitest';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';

describe('PaginatedResult<T> type shape', () => {
  it('should accept an object with items, total, page, pageSize and totalPages', () => {
    const result: PaginatedResult<string> = {
      items: ['a', 'b'],
      total: 10,
      page: 1,
      pageSize: 2,
      totalPages: 5,
    };

    expect(result.items).toEqual(['a', 'b']);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(5);
  });

  it('should work with ProductEntity-like objects', () => {
    type ProductLike = { id: string; createdAt: Date };
    const result: PaginatedResult<ProductLike> = {
      items: [{ id: 'p1', createdAt: new Date('2025-01-01') }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    expect(result.items[0].id).toBe('p1');
    expect(result.items[0].createdAt).toEqual(new Date('2025-01-01'));
  });
});
