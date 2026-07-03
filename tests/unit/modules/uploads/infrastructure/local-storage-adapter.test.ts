import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('LocalStorageAdapter', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('maps upload and read URLs to the local upload route in development', async () => {
    const { LocalStorageAdapter } =
      await import('@/modules/uploads/infrastructure/local-storage-adapter');
    const adapter = new LocalStorageAdapter();

    expect(
      await adapter.generateUploadUrl(
        'customization/user-1/photo.png',
        'image/png',
      ),
    ).toBe('/api/uploads/local/customization%2Fuser-1%2Fphoto.png');
    expect(
      await adapter.generateReadUrl('customization/user-1/photo.png'),
    ).toBe('/api/uploads/local/customization%2Fuser-1%2Fphoto.png');
    expect(adapter.getPublicUrl('customization/user-1/photo.png')).toBe(
      '/api/uploads/local/customization%2Fuser-1%2Fphoto.png',
    );
  });
});
