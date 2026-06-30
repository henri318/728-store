import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ChangeProductStatusUseCase } from '@/modules/products/application/change-product-status-use-case';
import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import type { ProductEntity } from '@/modules/products/domain/product-repository';

function makeProduct(overrides: Partial<ProductEntity> = {}): ProductEntity {
  return {
    id: 'p-1',
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [{ locale: 'es', name: 'Taza', description: 'Una taza' }],
    images: [],
    tags: [],
    ...overrides,
  };
}

describe('ChangeProductStatusUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates ACTIVE to ARCHIVED for the owning seller', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct()]);
    const updateSpy = vi.spyOn(repository, 'update');
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ARCHIVED,
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p-1',
        status: ProductStatus.ARCHIVED,
        updatedAt: new Date('2025-02-01T12:00:00.000Z'),
      }),
    );
    expect(updated.status).toBe(ProductStatus.ARCHIVED);
    expect(updated.updatedAt.toISOString()).toBe('2025-02-01T12:00:00.000Z');
  });

  it('rejects DRAFT to ARCHIVED because it must pass through ACTIVE', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeDraftProduct()]);
    const useCase = new ChangeProductStatusUseCase(repository);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        status: ProductStatus.ARCHIVED,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('updates DRAFT to ACTIVE', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeDraftProduct()]);
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ACTIVE,
    });

    expect(updated.status).toBe(ProductStatus.ACTIVE);
  });

  it('updates DRAFT to ELIMINATED', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeDraftProduct()]);
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ELIMINATED,
    });

    expect(updated.status).toBe(ProductStatus.ELIMINATED);
  });

  it('updates ACTIVE to ELIMINATED', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct()]);
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ELIMINATED,
    });

    expect(updated.status).toBe(ProductStatus.ELIMINATED);
  });

  it('updates ARCHIVED to ACTIVE', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct({ status: ProductStatus.ARCHIVED })]);
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ACTIVE,
    });

    expect(updated.status).toBe(ProductStatus.ACTIVE);
  });

  it('updates ARCHIVED to ELIMINATED', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct({ status: ProductStatus.ARCHIVED })]);
    const useCase = new ChangeProductStatusUseCase(repository);

    const updated = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      status: ProductStatus.ELIMINATED,
    });

    expect(updated.status).toBe(ProductStatus.ELIMINATED);
  });

  it('rejects same-status transitions as a no-op', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct()]);
    const useCase = new ChangeProductStatusUseCase(repository);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when the product does not exist', async () => {
    const repository = new MemoryProductRepository();
    const useCase = new ChangeProductStatusUseCase(repository);

    await expect(
      useCase.execute({
        productId: 'missing',
        sellerId: 'seller-1',
        status: ProductStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when the product belongs to another seller', async () => {
    const repository = new MemoryProductRepository();
    repository.seed([makeProduct({ sellerId: 'seller-2' })]);
    const useCase = new ChangeProductStatusUseCase(repository);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        status: ProductStatus.ARCHIVED,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

function makeDraftProduct(): ProductEntity {
  return makeProduct({ status: ProductStatus.DRAFT });
}
