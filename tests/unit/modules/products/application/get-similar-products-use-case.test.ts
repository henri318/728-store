import { describe, expect, it } from 'vitest';
import { GetSimilarProductsUseCase } from '@/modules/products/application/get-similar-products-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import type { TagEntity } from '@/modules/products/domain/entities/tag';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

function makeTag(id: string, name: string, slug: string): TagEntity {
  return { id, name, slug, createdAt: new Date() };
}

const tagSummer = makeTag('t1', 'Summer', 'summer');
const tagMug = makeTag('t2', 'Mug', 'mug');
const tagGift = makeTag('t3', 'Gift', 'gift');
const tagWood = makeTag('t5', 'Wood', 'wood');

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
            tags: [],
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
        tags: [tagSummer, tagMug, tagGift],
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
            tags: [],
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
        tags: [tagSummer, tagMug, tagGift],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer, tagMug],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute(
      'source',
      [tagSummer.id, tagMug.id, tagGift.id],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagWood],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', [tagSummer.id], 'es');

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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer, tagMug],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute(
      'source',
      [tagSummer.id, tagMug.id],
      'es',
    );

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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', [tagSummer.id], 'es', 1);

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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', [tagSummer.id], 'es');

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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
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
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
          {
            locale: 'es',
            name: 'Taza es',
            description: 'Desc es',
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        images: [],
        tags: [tagSummer],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const catResult = await useCase.execute('source', [tagSummer.id], 'cat');
    expect(catResult[0].displayName).toBe('Tassa cat');

    const esResult = await useCase.execute('source', [tagSummer.id], 'es');
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
            tags: [],
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
        tags: [tagSummer],
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
            tags: [],
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
        tags: [tagSummer],
      },
    ]);

    const useCase = new GetSimilarProductsUseCase(repository);
    const result = await useCase.execute('source', [tagSummer.id], 'es');

    expect(result[0].cover).not.toBeNull();
    expect(result[0].cover!.url).toBe('/p1-cover.png');
  });
});
