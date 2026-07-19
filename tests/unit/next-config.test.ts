import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadNextConfig() {
  vi.resetModules();
  const { default: nextConfig } = await import('@/next.config');
  return nextConfig;
}

describe('Next security headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enforces a Content Security Policy without external font sources', async () => {
    const nextConfig = await loadNextConfig();
    const rules = await nextConfig.headers?.();
    const csp = rules?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy',
    )?.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).not.toContain('fonts.cdnfonts.com');
  });

  it('allows browser uploads only to the configured R2 bucket origins', async () => {
    const accountId = '0123456789abcdef0123456789abcdef';
    vi.stubEnv('R2_ACCOUNT_ID', accountId);
    vi.stubEnv('R2_PUBLIC_BUCKET', 'product-assets');
    vi.stubEnv('R2_PRIVATE_BUCKET', 'private-assets');

    const nextConfig = await loadNextConfig();
    const rules = await nextConfig.headers?.();
    const csp = rules?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy',
    )?.value;

    expect(csp).toContain(
      `connect-src 'self' https://product-assets.${accountId}.r2.cloudflarestorage.com https://private-assets.${accountId}.r2.cloudflarestorage.com`,
    );
    expect(csp).not.toContain('https://*.r2.cloudflarestorage.com');
  });

  it('allows product media only from the configured public R2 origin', async () => {
    vi.stubEnv(
      'R2_PUBLIC_DOMAIN',
      'https://pub-0123456789abcdef.r2.dev/assets/',
    );

    const nextConfig = await loadNextConfig();
    const rules = await nextConfig.headers?.();
    const csp = rules?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy',
    )?.value;

    expect(csp).toContain(
      "media-src 'self' blob: https://pub-0123456789abcdef.r2.dev",
    );
    expect(csp).not.toContain('media-src https:');
  });

  it('does not add an invalid public domain to media sources', async () => {
    vi.stubEnv('R2_PUBLIC_DOMAIN', 'javascript:alert(1)');

    const nextConfig = await loadNextConfig();
    const rules = await nextConfig.headers?.();
    const csp = rules?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy',
    )?.value;

    expect(csp).toContain("media-src 'self' blob:");
    expect(csp).not.toContain('javascript:alert(1)');
  });
});
