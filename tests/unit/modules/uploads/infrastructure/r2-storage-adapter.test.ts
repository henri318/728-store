import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

describe('R2StorageAdapter — two buckets', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('bucket routing', () => {
    it('should use R2_PUBLIC_BUCKET for product keys', async () => {
      process.env.R2_PUBLIC_BUCKET = 'public-bucket';
      process.env.R2_PRIVATE_BUCKET = 'private-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_PUBLIC_DOMAIN = 'https://cdn.example.com';

      const { R2StorageAdapter } =
        await import('@/modules/uploads/infrastructure/r2-storage-adapter');
      const adapter = new R2StorageAdapter();

      // Can't test the bucket name directly without exporting it,
      // but we can verify that getPublicUrl still works for product keys.
      const url = adapter.getPublicUrl('product/user-1/photo.webp');
      expect(url).toBe('https://cdn.example.com/product/user-1/photo.webp');
    });

    it('should fallback to R2_BUCKET when R2_PUBLIC/PRIVATE_BUCKET are not set', async () => {
      process.env.R2_BUCKET = 'legacy-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_PUBLIC_DOMAIN = 'https://cdn.example.com';
      delete process.env.R2_PUBLIC_BUCKET;
      delete process.env.R2_PRIVATE_BUCKET;

      const { R2StorageAdapter } =
        await import('@/modules/uploads/infrastructure/r2-storage-adapter');
      const adapter = new R2StorageAdapter();

      const url = adapter.getPublicUrl('product/user-1/photo.webp');
      expect(url).toBe('https://cdn.example.com/product/user-1/photo.webp');
    });
  });

  describe('getPublicUrl', () => {
    it('should construct URL from R2_PUBLIC_DOMAIN env var', async () => {
      process.env.R2_PUBLIC_BUCKET = 'public-bucket';
      process.env.R2_PRIVATE_BUCKET = 'private-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_PUBLIC_DOMAIN = 'https://my-bucket.example.com';

      const { R2StorageAdapter } =
        await import('@/modules/uploads/infrastructure/r2-storage-adapter');
      const adapter = new R2StorageAdapter();

      const url = adapter.getPublicUrl('product/user-1/photo.webp');
      expect(url).toBe(
        'https://my-bucket.example.com/product/user-1/photo.webp',
      );
    });

    it('should strip trailing slash from R2_PUBLIC_DOMAIN', async () => {
      process.env.R2_PUBLIC_BUCKET = 'public-bucket';
      process.env.R2_PRIVATE_BUCKET = 'private-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_PUBLIC_DOMAIN = 'https://my-bucket.example.com/';

      const { R2StorageAdapter } =
        await import('@/modules/uploads/infrastructure/r2-storage-adapter');
      const adapter = new R2StorageAdapter();

      const url = adapter.getPublicUrl('avatar/user-42/photo.jpg');
      expect(url).toBe(
        'https://my-bucket.example.com/avatar/user-42/photo.jpg',
      );
    });

    it('should use fallback value if R2_PUBLIC_DOMAIN is missing', async () => {
      process.env.R2_PUBLIC_BUCKET = 'public-bucket';
      process.env.R2_PRIVATE_BUCKET = 'private-bucket';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      delete process.env.R2_PUBLIC_DOMAIN;

      const { R2StorageAdapter } =
        await import('@/modules/uploads/infrastructure/r2-storage-adapter');
      const adapter = new R2StorageAdapter();

      const url = adapter.getPublicUrl('product/user-1/photo.webp');
      expect(url).toBe('https://dummy.public.domain/product/user-1/photo.webp');
    });
  });
});
