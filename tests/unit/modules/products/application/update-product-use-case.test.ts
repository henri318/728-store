import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { UpdateProductUseCase } from '@/modules/products/application/update-product-use-case';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';

function makeProduct(overrides: Partial<ProductEntity> = {}): ProductEntity {
  return {
    id: 'p-1',
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    customizationConfig: ProductCustomizationConfig.default(),
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [
      { locale: 'es', name: 'Taza', description: 'Una taza' },
      { locale: 'cat', name: 'Tassa', description: 'Una tassa' },
    ],
    images: [],
    tags: [],
    ...overrides,
  };
}

describe('UpdateProductUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the owned product translation, price, status, and customization config', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct()]);
    const outbox = new MemoryOutboxRepository();
    const useCase = new UpdateProductUseCase(repo, outbox);

    const result = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      locale: 'es',
      name: 'Taza personalizada',
      description: 'Nueva descripción',
      price: 14.5,
      status: ProductStatus.ARCHIVED,
      customizationConfig: {
        mode: 'photo',
        previewEnabled: true,
        previewTemplateUrl: 'https://cdn.example.com/mug.png',
        textOffset: null,
        imageOffset: { x: 5, y: 8 },
      },
    });

    const saved = await repo.findById('p-1', 'es');

    expect(result.status).toBe(ProductStatus.ARCHIVED);
    expect(result.updatedAt.toISOString()).toBe('2025-02-01T12:00:00.000Z');
    expect(saved?.translations[0]).toMatchObject({
      locale: 'es',
      name: 'Taza personalizada',
      description: 'Nueva descripción',
    });
    expect(saved?.basePrice.amount).toBe(14.5);
    expect(saved?.customizationConfig?.mode).toBe('photo');
    expect(outbox.events).toEqual([
      {
        eventType: GlobalEvents.PRODUCT_UPDATED,
        payload: {
          productId: 'p-1',
          sellerId: 'seller-1',
          status: ProductStatus.ARCHIVED,
        },
      },
    ]);
  });

  it('rejects missing products', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new UpdateProductUseCase(repo);

    await expect(
      useCase.execute({
        productId: 'missing',
        sellerId: 'seller-1',
        locale: 'es',
        name: 'Taza',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects cross-seller updates', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct({ sellerId: 'seller-2' })]);
    const useCase = new UpdateProductUseCase(repo);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        locale: 'es',
        name: 'Taza',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects empty updates', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct()]);
    const useCase = new UpdateProductUseCase(repo);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        locale: 'es',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
