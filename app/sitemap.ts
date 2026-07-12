import type { MetadataRoute } from 'next';
import { container } from '@/composition-root/container';
import { APP_BASE_URL } from '@/shared/kernel/config';

const PAGE_SIZE = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repository = container.getProductRepository();
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await repository.findPaginated({
      audience: 'public',
      lang: 'es',
      page,
      pageSize: PAGE_SIZE,
    });
    products.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  }

  return [
    {
      url: `${APP_BASE_URL}/es`,
      alternates: {
        languages: {
          es: `${APP_BASE_URL}/es`,
          ca: `${APP_BASE_URL}/cat`,
        },
      },
    },
    ...products.map((product) => ({
      url: `${APP_BASE_URL}/es/products/${product.id}`,
      lastModified: product.updatedAt,
      alternates: {
        languages: {
          es: `${APP_BASE_URL}/es/products/${product.id}`,
          ca: `${APP_BASE_URL}/cat/products/${product.id}`,
        },
      },
    })),
  ];
}
