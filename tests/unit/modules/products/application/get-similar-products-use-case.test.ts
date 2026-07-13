import { describe, expect, it } from 'vitest';
import { GetSimilarProductsUseCase } from '@/modules/products/application/get-similar-products-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

describe('GetSimilarProductsUseCase', () => {
  it('returns products ordered by shared tag count', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Taza A',
            description: null,
            tags: ['Summer', 'Mug', 'Gift'],
            sizes: [],
            designChangeDescription: null,
          },
          {
            locale: 'cat',
            name: 'Tassa A',
            description: null,
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Taza 1',
            description: 'Comparte 3 tags',
            tags: ['Summer', 'Mug', 'Gift'],
            sizes: [],
            designChangeDescription: null,
          },
          {
            locale: 'cat',
            name: 'Tassa 1',
            description: null,
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p2',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Taza 2',
            description: 'Comparte 2 tags',
            tags: ['Summer', 'Mug'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p3',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Taza 3',
            description: 'Comparte 1 tag',
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute(
      'source',
      ['Summer', 'Mug', 'Gift'],
      'es',
      3,
    );

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('p1');
    expect(result[1].id).toBe('p2');
    expect(result[2].id).toBe('p3');
  });

  it('returns empty when the source product has no tags', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Sin Tags',
            description: null,
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', [], 'es');

    expect(result).toHaveLength(0);
  });

  it('returns empty when no other products share tags', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'other',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Other',
            description: null,
            tags: ['Wood'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', ['Summer'], 'es');

    expect(result).toHaveLength(0);
  });

  it('excludes the source product itself', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer', 'Mug'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', ['Summer', 'Mug'], 'es');

    expect(result).toHaveLength(0);
  });

  it('respects the limit parameter', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'P1',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p2',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'P2',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', ['Summer'], 'es', 1);

    expect(result).toHaveLength(1);
  });

  it('excludes non-ACTIVE products', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'draft-p',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Draft',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', ['Summer'], 'es');

    expect(result).toHaveLength(0);
  });

  it('resolves the display translation for the given locale', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'cat',
            name: 'Tassa cat',
            description: 'Desc cat',
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
          {
            locale: 'es',
            name: 'Taza es',
            description: 'Desc es',
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const catResult = await useCase.execute('source', ['Summer'], 'cat');
    expect(catResult[0].displayName).toBe('Tassa cat');

    const esResult = await useCase.execute('source', ['Summer'], 'es');
    expect(esResult[0].displayName).toBe('Taza es');
  });

  it('returns cover image when available', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([
      {
        id: 'source',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'Source',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [
          {
            id: 'img-1',
            url: '/cover.png',
            alt: 'Cover',
            mimeType: 'image/png',
            purpose: ProductImagePurpose.COVER,
            position: 0,
            posterUrl: null,
            productId: 'source',
            createdAt: new Date(),
          },
        ],
        tags: [],
      },
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [
          {
            locale: 'es',
            name: 'P1',
            description: null,
            tags: ['Summer'],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [
          {
            id: 'img-2',
            url: '/p1-cover.png',
            alt: 'P1 Cover',
            mimeType: 'image/png',
            purpose: ProductImagePurpose.COVER,
            position: 0,
            posterUrl: null,
            productId: 'p1',
            createdAt: new Date(),
          },
        ],
        tags: [],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', ['Summer'], 'es');

    expect(result[0].cover).not.toBeNull();
    expect(result[0].cover!.url).toBe('/p1-cover.png');
  });
});
