import { describe, expect, it } from 'vitest';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

describe('GetProductByIdUseCase', () => {
  it('returns the resolved translation with fallback sizes and metadata', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'p-1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        translations: [
          {
            locale: 'cat',
            name: 'Tassa',
            description: 'Una tassa',
            tags: ['llar'],
            sizes: ['M', 'L'],
            designChangeDescription: 'Canvi',
          },
          {
            locale: 'es',
            name: 'Taza',
            description: 'Una taza',
            tags: ['hogar'],
            sizes: ['S', 'M'],
            designChangeDescription: 'Base',
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetProductByIdUseCase(repository);
    const result = await useCase.execute('p-1', 'fr');

    expect(result.displayName).toBe('Taza');
    expect(result.displayDescription).toBe('Una taza');
    expect(result.displayTranslation?.sizes).toEqual(['S', 'M']);
    expect(result.displayTranslation?.tags).toEqual(['hogar']);
  });

  it('returns empty display text when the product has no translations', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'p-2',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        translations: [],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetProductByIdUseCase(repository);
    const result = await useCase.execute('p-2', 'fr');

    expect(result.displayName).toBe('');
    expect(result.displayDescription).toBe('');
    expect(result.displayTranslation).toBeNull();
  });
});
