import { describe, expect, it } from 'vitest';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { NotFoundError } from '@/shared/kernel/app-error';

describe('GetProductByIdUseCase', () => {
  it('throws NotFoundError when the product is absent', async () => {
    const repository = new MemoryProductRepository();
    const useCase = new GetProductByIdUseCase(repository);

    await expect(useCase.execute('missing', 'es')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

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

  describe('audience filter (SEC-04)', () => {
    it('returns ACTIVE product when audience is public', async () => {
      const repository = new MemoryProductRepository();
      repository.seed([
        {
          id: 'p-active',
          basePrice: ProductPrice.create(20, Currency.EUR),
          sellerId: 'seller-1',
          sellerName: 'Shop',
          status: ProductStatus.ACTIVE,
          categoryId: null,
          category: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
          translations: [
            {
              locale: 'es',
              name: 'Camiseta',
              description: 'Una camiseta',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          images: [],
          tags: [],
        },
      ]);

      const useCase = new GetProductByIdUseCase(repository);
      const result = await useCase.execute('p-active', 'es', 'public');

      expect(result.displayName).toBe('Camiseta');
    });

    it('throws when audience is public and product is DRAFT', async () => {
      const repository = new MemoryProductRepository();
      repository.seed([
        {
          id: 'p-draft',
          basePrice: ProductPrice.create(20, Currency.EUR),
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
              name: 'Borrador',
              description: 'No visible',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          images: [],
          tags: [],
        },
      ]);

      const useCase = new GetProductByIdUseCase(repository);

      await expect(useCase.execute('p-draft', 'es', 'public')).rejects.toThrow(
        'Product not found',
      );
    });

    it('throws when audience is public and product is ARCHIVED', async () => {
      const repository = new MemoryProductRepository();
      repository.seed([
        {
          id: 'p-archived',
          basePrice: ProductPrice.create(20, Currency.EUR),
          sellerId: 'seller-1',
          sellerName: 'Shop',
          status: ProductStatus.ARCHIVED,
          categoryId: null,
          category: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
          translations: [
            {
              locale: 'es',
              name: 'Archivo',
              description: 'Archivado',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          images: [],
          tags: [],
        },
      ]);

      const useCase = new GetProductByIdUseCase(repository);

      await expect(
        useCase.execute('p-archived', 'es', 'public'),
      ).rejects.toThrow('Product not found');
    });

    it('returns DRAFT product when audience is not public (seller/admin)', async () => {
      const repository = new MemoryProductRepository();
      repository.seed([
        {
          id: 'p-draft-2',
          basePrice: ProductPrice.create(20, Currency.EUR),
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
              name: 'Interno',
              description: 'Vista interna',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          images: [],
          tags: [],
        },
      ]);

      const useCase = new GetProductByIdUseCase(repository);
      const result = await useCase.execute('p-draft-2', 'es', 'seller');

      expect(result.displayName).toBe('Interno');
    });

    it('returns DRAFT product when no audience is passed (backward compat)', async () => {
      const repository = new MemoryProductRepository();
      repository.seed([
        {
          id: 'p-draft-3',
          basePrice: ProductPrice.create(20, Currency.EUR),
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
              name: 'Sin audiencia',
              description: 'Sin filtro',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          images: [],
          tags: [],
        },
      ]);

      const useCase = new GetProductByIdUseCase(repository);
      const result = await useCase.execute('p-draft-3', 'es');

      expect(result.displayName).toBe('Sin audiencia');
    });
  });
});
