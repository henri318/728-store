import { describe, it, expect, beforeEach } from 'vitest';
import { AdminListSellerProductsUseCase } from '@/modules/products/application/admin-list-seller-products-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('AdminListSellerProductsUseCase', () => {
  let productRepository: MemoryProductRepository;
  let useCase: AdminListSellerProductsUseCase;

  beforeEach(() => {
    productRepository = new MemoryProductRepository();
    useCase = new AdminListSellerProductsUseCase(productRepository);

    productRepository.seed([
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 's1',
        sellerName: 'Store 1',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        translations: [
          { locale: 'es', name: 'Taza', description: 'Una taza' },
          { locale: 'cat', name: 'Tassa', description: 'Una tassa' },
        ],
        customizations: [],
        images: [],
        tags: [],
      },
      {
        id: 'p2',
        basePrice: ProductPrice.create(20, Currency.EUR),
        sellerId: 's1',
        sellerName: 'Store 1',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        translations: [
          { locale: 'es', name: 'Plato', description: 'Un plato' },
        ],
        customizations: [],
        images: [],
        tags: [],
      },
      {
        id: 'p3',
        basePrice: ProductPrice.create(30, Currency.EUR),
        sellerId: 's2',
        sellerName: 'Store 2',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-03'),
        translations: [{ locale: 'es', name: 'Vaso', description: 'Un vaso' }],
        customizations: [],
        images: [],
        tags: [],
      },
    ]);
  });

  it('returns only products for the given seller', async () => {
    const result = await useCase.execute({ sellerId: 's1', locale: 'es' });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.sellerId === 's1')).toBe(true);
  });

  it('filters translations by locale', async () => {
    const result = await useCase.execute({ sellerId: 's1', locale: 'cat' });

    expect(result).toHaveLength(2);
    // p1 has a cat translation, p2 does not
    const p1 = result.find((p) => p.id === 'p1');
    expect(p1?.translations).toHaveLength(1);
    expect(p1?.translations[0].locale).toBe('cat');

    const p2 = result.find((p) => p.id === 'p2');
    expect(p2?.translations).toHaveLength(0);
  });

  it('returns empty array when seller has no products', async () => {
    const result = await useCase.execute({
      sellerId: 's-nonexistent',
      locale: 'es',
    });

    expect(result).toEqual([]);
  });

  it('does not return products from other sellers', async () => {
    const result = await useCase.execute({ sellerId: 's2', locale: 'es' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p3');
    expect(result[0].sellerId).toBe('s2');
  });
});
