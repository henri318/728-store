import { describe, it, expect } from 'vitest';
import {
  toDomainProduct,
  toPersistenceProduct,
} from '@/modules/products/infrastructure/mapper';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';

describe('product customization config mapping', () => {
  it('maps null config to the domain default', () => {
    const product = toDomainProduct({
      id: 'p-1',
      basePrice: 19.99,
      sellerId: 's-1',
      seller: { name: 'Shop' },
      status: 'ACTIVE',
      categoryId: null,
      category: null,
      customizationConfig: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      translations: [],
      images: [],
      tags: [],
    });

    expect(product.customizationConfig?.mode).toBe('description');
    expect(product.customizationConfig?.previewEnabled).toBe(false);
  });

  it('round-trips a custom config through persistence mapping', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'photo',
      previewEnabled: true,
      previewTemplateUrl: 'https://cdn.example.com/base.png',
      textOffset: null,
      imageOffset: { x: 1, y: 2 },
    });

    const persistence = toPersistenceProduct({
      id: 'p-1',
      basePrice: {
        amount: 19.99,
        currency: 'EUR',
      } as never,
      sellerId: 's-1',
      sellerName: 'Shop',
      status: 'ACTIVE' as never,
      categoryId: null,
      category: null,
      customizationConfig: config,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      translations: [],
      images: [],
      tags: [],
    });

    expect(persistence.customizationConfig).toEqual({
      mode: 'photo',
      previewEnabled: true,
      previewTemplateUrl: 'https://cdn.example.com/base.png',
      textOffset: null,
      imageOffset: { x: 1, y: 2 },
    });
  });
});
