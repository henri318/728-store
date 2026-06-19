import { describe, it, expect, beforeEach } from 'vitest';
import { GetProductsUseCase } from '@/modules/products/application/get-products-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';

describe('GetProductsUseCase with i18n', () => {
  let productRepository: MemoryProductRepository;
  let useCase: GetProductsUseCase;

  beforeEach(() => {
    productRepository = new MemoryProductRepository();
    useCase = new GetProductsUseCase(productRepository);

    productRepository.seed([
      {
        id: '1',
        basePrice: 10,
        sellerId: 's1',
        sellerName: 'Store 1',
        translations: [
          { locale: 'es', name: 'Taza', description: 'Una taza' },
          { locale: 'cat', name: 'Tassa', description: 'Una tassa' }
        ],
        customizations: [],
      }
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
