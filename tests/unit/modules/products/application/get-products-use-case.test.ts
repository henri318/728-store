import { describe, it, expect, beforeEach } from 'vitest';
import { GetProductsUseCase } from '@/modules/products/application/get-products-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('GetProductsUseCase with i18n', () => {
  let productRepository: MemoryProductRepository;
  let useCase: GetProductsUseCase;

  beforeEach(() => {
    productRepository = new MemoryProductRepository();
    useCase = new GetProductsUseCase(productRepository);

    productRepository.seed([
      {
        id: '1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 's1',
        sellerName: 'Store 1',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          { locale: 'es', name: 'Taza', description: 'Una taza' },
          { locale: 'cat', name: 'Tassa', description: 'Una tassa' },
        ],
        images: [],
        tags: [],
      },
    ]);
  });

  it('should return products in Spanish', async () => {
    const result = await useCase.execute('es');
    expect(result[0].displayName).toBe('Taza');
    expect(result[0].displayDescription).toBe('Una taza');
  });

  it('should return products in Catalan', async () => {
    const result = await useCase.execute('cat');
    expect(result[0].displayName).toBe('Tassa');
    expect(result[0].displayDescription).toBe('Una tassa');
  });

  it('should return "Untranslated" if locale is missing', async () => {
    const result = await useCase.execute('en');
    expect(result[0].displayName).toBe('Untranslated');
  });
});
