import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

describe('Next security headers', () => {
  it('enforces a Content Security Policy without external font sources', async () => {
    const rules = await nextConfig.headers?.();
    const csp = rules?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy',
    )?.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).not.toContain('fonts.cdnfonts.com');
  });
});
