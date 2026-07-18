import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/shared/kernel/app-error';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';
import { GetSellerProductFormUseCase } from '@/modules/products/application/get-seller-product-form-use-case';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';
import type { SellerOwnershipLookupPort } from '@/modules/products/domain/seller-ownership-lookup-port';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';

const categoryRepository = (): CategoryRepository => ({
  findAll: vi.fn(async (): Promise<CategoryEntity[]> => [
    {
      id: 'category-1',
      slug: 'clothing',
      parentId: null,
      createdAt: new Date(),
      translations: [
        { locale: 'es', name: 'Ropa' },
        { locale: 'cat', name: 'Roba' },
      ],
    },
  ]),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countProducts: vi.fn(),
});

const sellerLookup = (sellerId: string | null): SellerOwnershipLookupPort => ({
  findSellerIdByUserId: vi.fn(async () => sellerId),
});

describe('GetSellerProductFormUseCase', () => {
  it('loads the owned product and localized category options', async () => {
    const productRepository = new MemoryProductRepository();
    productRepository.seed([
      {
        id: 'product-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Shop',
        status: ProductStatus.DRAFT,
        categoryId: 'category-1',
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [{ locale: 'es', name: 'Taza', description: null }],
        images: [],
        tags: [],
      },
    ]);
    const useCase = new GetSellerProductFormUseCase(
      productRepository,
      new ListCategoriesUseCase(categoryRepository()),
      sellerLookup('seller-1'),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      productId: 'product-1',
      locale: 'cat',
    });

    expect(result.product.id).toBe('product-1');
    expect(result.categories).toEqual([{ id: 'category-1', name: 'Roba' }]);
  });

  it('rejects a product that does not belong to the current seller', async () => {
    const productRepository = new MemoryProductRepository();
    productRepository.seed([
      {
        id: 'product-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'another-seller',
        sellerName: 'Other shop',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [],
        images: [],
        tags: [],
      },
    ]);
    const useCase = new GetSellerProductFormUseCase(
      productRepository,
      new ListCategoriesUseCase(categoryRepository()),
      sellerLookup('seller-1'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        productId: 'product-1',
        locale: 'es',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a user without a seller account', async () => {
    const useCase = new GetSellerProductFormUseCase(
      new MemoryProductRepository(),
      new ListCategoriesUseCase(categoryRepository()),
      sellerLookup(null),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        productId: 'product-1',
        locale: 'es',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
