import type { MetadataRoute } from 'next';
import { APP_BASE_URL } from '@/shared/kernel/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/es/admin/',
        '/cat/admin/',
        '/es/seller/',
        '/cat/seller/',
      ],
    },
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  };
}
