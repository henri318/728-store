import { describe, expect, it } from 'vitest';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { serializeProduct } from '@/modules/products/presentation/product-response';

function makeProduct() {
  return {
    id: 'prod-1',
    basePrice: ProductPrice.create(24.5, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [
      {
        locale: 'es',
        name: 'Taza',
        description: 'Una taza',
        designChangeDescription: 'Privado',
      },
    ],
    images: [
      {
        id: 'cover-1',
        url: '/cover.jpg',
        alt: 'Portada',
        position: 0,
        purpose: ProductImagePurpose.COVER,
        mimeType: 'image/jpeg',
        posterUrl: null,
        productId: 'prod-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'showcase-1',
        url: '/showcase.mp4',
        alt: 'Demo',
        position: 0,
        purpose: ProductImagePurpose.SHOWCASE,
        mimeType: 'video/mp4',
        posterUrl: '/poster.jpg',
        productId: 'prod-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'base-1',
        url: '/base.jpg',
        alt: 'Base',
        position: 0,
        purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
        mimeType: 'image/jpeg',
        posterUrl: null,
        productId: 'prod-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ],
    tags: [],
  };
}

describe('serializeProduct', () => {
  it('splits detail images by purpose and keeps deprecated images compatibility', () => {
    const product = makeProduct();

    const serialized = serializeProduct(product as never);

    expect(serialized.cover).toMatchObject({
      id: 'cover-1',
      purpose: ProductImagePurpose.COVER,
    });
    expect(serialized.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(serialized.updatedAt).toBe('2025-01-02T00:00:00.000Z');
    expect(serialized.showcase).toHaveLength(1);
    expect(serialized.customizableBase).toHaveLength(1);
    expect(serialized.images).toHaveLength(3);
    expect(serialized.images[1]).toMatchObject({
      purpose: ProductImagePurpose.SHOWCASE,
      posterUrl: '/poster.jpg',
    });
  });

  it('hides private translation metadata for public detail responses', () => {
    const serialized = serializeProduct(makeProduct() as never, {
      publicView: true,
    });

    expect(serialized.translations[0]).not.toHaveProperty(
      'designChangeDescription',
    );
  });

  it('trims listing payloads to cover-only cards', () => {
    const serialized = serializeProduct(makeProduct() as never, {
      listingView: true,
    });

    expect(serialized.cover).toEqual({
      url: '/cover.jpg',
      alt: 'Portada',
    });
    expect(serialized).not.toHaveProperty('images');
    expect(serialized).not.toHaveProperty('hasVideoShowcase');
    expect(serialized).not.toHaveProperty('showcase');
    expect(serialized).not.toHaveProperty('customizableBase');
  });
});
