import type { Prisma } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSeedProducts } from '../../../prisma/seed-data';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

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

    expect(shirt.status).toBe('ACTIVE');
    expect(shirt.images.create).toHaveLength(1);
    expect(shirt.images.create[0].purpose).toBe(
      ProductImagePurpose.CUSTOMIZABLE_BASE,
    );
    expect(shirt.images.create[0].mimeType).toBe('image/png');
    expect(shirt.customizationConfig.previewEnabled).toBe(true);
    expect(shirt.customizationConfig.previewTemplateUrl).toBe(
      shirt.images.create[0].url,
    );
    expect(shirt.translations.create).toHaveLength(3);
    expect(
      shirt.translations.create.map((translation) => translation.locale),
    ).toEqual(['es', 'cat', 'en']);

    expect(mug.status).toBe('ACTIVE');
    expect(mug.images.create).toHaveLength(2);
    expect(mug.images.create[0].purpose).toBe(ProductImagePurpose.COVER);
    expect(mug.images.create[1].purpose).toBe(ProductImagePurpose.SHOWCASE);
    expect(mug.images.create[0].mimeType).toBe('image/png');
    expect(mug.images.create[1].mimeType).toBe('image/webp');
    expect(mug.customizationConfig.previewEnabled).toBe(true);
    expect(mug.customizationConfig.previewTemplateUrl).toBe(
      mug.images.create[0].url,
    );
    expect(mug.translations.create).toHaveLength(3);
    expect(
      mug.translations.create.map((translation) => translation.locale),
    ).toEqual(['es', 'cat', 'en']);

    expect(hoodie.status).toBe('ACTIVE');
    expect(hoodie.images.create).toHaveLength(1);
    expect(hoodie.images.create[0].purpose).toBe(
      ProductImagePurpose.CUSTOMIZABLE_BASE,
    );
    expect(hoodie.images.create[0].mimeType).toBe('image/jpeg');
    expect(hoodie.customizationConfig.previewEnabled).toBe(false);
    expect(hoodie.customizationConfig.previewTemplateUrl).toBeNull();
    expect(hoodie.translations.create).toHaveLength(3);
  });

  it('serves the seed mug image from the product asset container', () => {
    process.env.SEED_PRODUCT_ASSET_BASE_URL = 'https://assets.example.test';

    const [, mug] = buildSeedProducts('seller-123');

    expect(mug.images.create[0].url).toBe(
      'https://assets.example.test/products/taza.png',
    );
    expect(mug.images.create[0].purpose).toBe(ProductImagePurpose.COVER);
    expect(mug.images.create[0].mimeType).toBe('image/png');
    expect(mug.images.create[1].purpose).toBe(ProductImagePurpose.SHOWCASE);
    expect(mug.images.create[1].mimeType).toBe('image/webp');
    expect(mug.customizationConfig.previewTemplateUrl).toBe(
      'https://assets.example.test/products/taza.png',
    );
  });

  it('assigns explicit purposes to every seed image', () => {
    const products = buildSeedProducts('seller-123');

    for (const product of products) {
      for (const image of product.images.create) {
        expect(image.purpose).toBeDefined();
        expect(image.mimeType).not.toBe('image/svg+xml');
      }
    }
  });
});

describe('Prisma seed type compatibility', () => {
  it('keeps the Mochila seed image compatible with Prisma nested create typing', () => {
    const mochilaImage = {
      url: '/img/products/example.webp',
      alt: 'Mochila de Algodón Orgánico',
      position: 0,
      purpose: 'CUSTOMIZABLE_BASE',
      mimeType: 'image/webp',
    } satisfies Prisma.ProductImageUncheckedCreateWithoutProductInput;

    expect(mochilaImage.purpose).toBe('CUSTOMIZABLE_BASE');
    expect(mochilaImage.mimeType).toBe('image/webp');
  });
});
