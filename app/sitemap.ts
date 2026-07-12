import type { MetadataRoute } from 'next';
import { container } from '@/composition-root/container';
import { APP_BASE_URL } from '@/shared/kernel/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repository = container.getProductRepository();
  const products = await repository.findAllPublicForSitemap();

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
    {
      url: `${APP_BASE_URL}/cat`,
      alternates: {
        languages: {
          es: `${APP_BASE_URL}/es`,
          ca: `${APP_BASE_URL}/cat`,
        },
      },
    },
    ...products.flatMap((product) => {
      const alternates = {
        languages: {
          es: `${APP_BASE_URL}/es/products/${product.id}`,
          ca: `${APP_BASE_URL}/cat/products/${product.id}`,
        },
      };

      return [
        {
          url: `${APP_BASE_URL}/es/products/${product.id}`,
          lastModified: product.updatedAt,
          alternates,
        },
        {
          url: `${APP_BASE_URL}/cat/products/${product.id}`,
          lastModified: product.updatedAt,
          alternates,
        },
      ];
    }),
  ];
}
