import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

describe('R2StorageAdapter — getPublicUrl', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should construct URL from R2_PUBLIC_DOMAIN env var', async () => {
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_PUBLIC_DOMAIN = 'https://my-bucket.example.com';

    const { R2StorageAdapter } =
      await import('@/modules/uploads/infrastructure/r2-storage-adapter');
    const adapter = new R2StorageAdapter();

    const url = adapter.getPublicUrl('product/user-1/photo.webp');
    expect(url).toBe('https://my-bucket.example.com/product/user-1/photo.webp');
  });

  it('should strip trailing slash from R2_PUBLIC_DOMAIN', async () => {
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_PUBLIC_DOMAIN = 'https://my-bucket.example.com/';

    const { R2StorageAdapter } =
      await import('@/modules/uploads/infrastructure/r2-storage-adapter');
    const adapter = new R2StorageAdapter();

    const url = adapter.getPublicUrl('avatar/user-42/photo.jpg');
    expect(url).toBe('https://my-bucket.example.com/avatar/user-42/photo.jpg');
  });

  it('should throw if R2_PUBLIC_DOMAIN is missing', async () => {
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    delete process.env.R2_PUBLIC_DOMAIN;

    const { R2StorageAdapter } =
      await import('@/modules/uploads/infrastructure/r2-storage-adapter');

    expect(() => new R2StorageAdapter()).toThrow(
      'Missing required environment variable: R2_PUBLIC_DOMAIN',
    );
  });
});
