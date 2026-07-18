import { describe, expect, it } from 'vitest';
import { GetCartProductViewsUseCase } from '@/modules/products/application/get-cart-product-views-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

describe('GetCartProductViewsUseCase', () => {
  it('returns localized cart views without exposing product translations', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'product-1',
        basePrice: ProductPrice.create(12.5, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Botiga',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          { locale: 'es', name: 'Taza', description: null },
          { locale: 'cat', name: 'Tassa', description: null },
        ],
        images: [],
        tags: [],
      },
    ]);

    await expect(
      new GetCartProductViewsUseCase(repository).findByIds(
        ['product-1'],
        'cat',
      ),
    ).resolves.toEqual([
      {
        id: 'product-1',
        basePrice: 12.5,
        currency: Currency.EUR,
        sellerId: 'seller-1',
        displayName: 'Tassa',
        sellerName: 'Botiga',
        imageUrl: null,
        images: [],
      },
    ]);
  });
});
