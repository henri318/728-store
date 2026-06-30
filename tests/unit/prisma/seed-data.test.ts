import { afterEach, describe, expect, it } from 'vitest';
import { buildSeedProducts } from '../../../prisma/seed-data';

describe('buildSeedProducts', () => {
  const originalProductAssetBaseUrl = process.env.SEED_PRODUCT_ASSET_BASE_URL;

  afterEach(() => {
    if (originalProductAssetBaseUrl === undefined) {
      delete process.env.SEED_PRODUCT_ASSET_BASE_URL;
    } else {
      process.env.SEED_PRODUCT_ASSET_BASE_URL = originalProductAssetBaseUrl;
    }
  });

  it('adds preview-ready images to customizable seed products', () => {
    process.env.SEED_PRODUCT_ASSET_BASE_URL = 'http://localhost:8081';
    const products = buildSeedProducts('seller-123');

    expect(products).toHaveLength(3);
    expect(products.every((product) => product.sellerId === 'seller-123')).toBe(
      true,
    );

    const [shirt, mug, hoodie] = products;

    for (const product of [shirt, mug]) {
      expect(product.status).toBe('ACTIVE');
      expect(product.images.create).toHaveLength(1);
      expect(product.customizationConfig.previewEnabled).toBe(true);
      expect(product.customizationConfig.previewTemplateUrl).toBe(
        product.images.create[0].url,
      );
      expect(product.translations.create).toHaveLength(3);
      expect(
        product.translations.create.map((translation) => translation.locale),
      ).toEqual(['es', 'cat', 'en']);
    }

    expect(hoodie.status).toBe('ACTIVE');
    expect(hoodie.images.create).toHaveLength(1);
    expect(hoodie.customizationConfig.previewEnabled).toBe(false);
    expect(hoodie.customizationConfig.previewTemplateUrl).toBeNull();
    expect(hoodie.translations.create).toHaveLength(3);
  });

  it('serves the seed mug image from the product asset container', () => {
    process.env.SEED_PRODUCT_ASSET_BASE_URL = 'http://assets.example.test';

    const [, mug] = buildSeedProducts('seller-123');

    expect(mug.images.create[0].url).toBe(
      'http://assets.example.test/products/taza.png',
    );
    expect(mug.customizationConfig.previewTemplateUrl).toBe(
      'http://assets.example.test/products/taza.png',
    );
  });
});
