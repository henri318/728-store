import { describe, expect, it } from 'vitest';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import {
  hasDefaultLocaleTranslation,
  resolveDisplay,
} from '@/modules/products/domain/entities/product';

describe('Product helpers', () => {
  it('detects a valid default locale translation', () => {
    expect(
      hasDefaultLocaleTranslation({
        id: 'p-1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        translations: [
          {
            locale: 'es',
            name: 'Camiseta',
            description: 'Una camiseta',
            tags: ['ropa'],
            sizes: ['S'],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      }),
    ).toBe(true);
  });

  it('rejects products without a usable es translation', () => {
    expect(
      hasDefaultLocaleTranslation({
        id: 'p-1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        translations: [
          {
            locale: 'cat',
            name: 'Samarreta',
            description: 'Una samarreta',
            tags: ['roba'],
            sizes: ['M'],
            designChangeDescription: null,
          },
          {
            locale: 'es',
            name: ''.repeat(3),
            description: 'Fallback',
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      }),
    ).toBe(false);
  });

  it('resolves the display translation through the product helper', () => {
    const product = {
      id: 'p-1',
      basePrice: ProductPrice.create(10, Currency.EUR),
      sellerId: 'seller-1',
      sellerName: 'Shop',
      status: ProductStatus.DRAFT,
      categoryId: null,
      category: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      translations: [
        {
          locale: 'cat',
          name: 'Samarreta',
          description: 'Una samarreta',
          tags: ['roba'],
          sizes: ['M'],
          designChangeDescription: null,
        },
        {
          locale: 'es',
          name: 'Camiseta',
          description: 'Una camiseta',
          tags: ['ropa'],
          sizes: ['S'],
          designChangeDescription: 'Base',
        },
      ],
      images: [],
      tags: [],
    };

    expect(resolveDisplay(product, 'fr')).toMatchObject({
      locale: 'es',
      name: 'Camiseta',
      tags: ['ropa'],
      sizes: ['S'],
      designChangeDescription: 'Base',
    });
  });
});
