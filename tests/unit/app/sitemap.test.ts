import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAllPublicForSitemapMock: vi.fn(),
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: () => ({
      findAllPublicForSitemap: mocks.findAllPublicForSitemapMock,
    }),
  },
}));

import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('includes paired localized home and public product URLs only', async () => {
    mocks.findAllPublicForSitemapMock.mockResolvedValue([
      {
        id: 'prod-1',
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      },
    ]);

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
        url: 'http://localhost:3000/cat',
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
      {
        url: 'http://localhost:3000/cat/products/prod-1',
        lastModified: new Date('2025-01-02T00:00:00.000Z'),
        alternates: {
          languages: {
            es: 'http://localhost:3000/es/products/prod-1',
            ca: 'http://localhost:3000/cat/products/prod-1',
          },
        },
      },
    ]);
    expect(mocks.findAllPublicForSitemapMock).toHaveBeenCalledOnce();
  });
});
