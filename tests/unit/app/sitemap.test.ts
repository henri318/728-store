import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findPaginatedMock: vi.fn(),
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: () => ({
      findPaginated: mocks.findPaginatedMock,
    }),
  },
}));

import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('includes localized home and public product URLs only', async () => {
    mocks.findPaginatedMock.mockResolvedValue({
      items: [
        {
          id: 'prod-1',
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    await expect(sitemap()).resolves.toEqual([
      {
        url: 'http://localhost:3000/es',
        alternates: {
          languages: {
            es: 'http://localhost:3000/es',
            ca: 'http://localhost:3000/cat',
          },
        },
      },
      {
        url: 'http://localhost:3000/es/products/prod-1',
        lastModified: new Date('2025-01-02T00:00:00.000Z'),
        alternates: {
          languages: {
            es: 'http://localhost:3000/es/products/prod-1',
            ca: 'http://localhost:3000/cat/products/prod-1',
          },
        },
      },
    ]);
    expect(mocks.findPaginatedMock).toHaveBeenCalledWith({
      audience: 'public',
      lang: 'es',
      page: 1,
      pageSize: 1000,
    });
  });
});
