import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  it('allows public crawling and advertises the application sitemap', () => {
    expect(robots()).toEqual({
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
      sitemap: 'http://localhost:3000/sitemap.xml',
    });
  });
});
