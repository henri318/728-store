import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { CreateProductUseCase } from '@/modules/products/application/create-product-use-case';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ValidationError } from '@/shared/kernel/app-error';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';

describe('CreateProductUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a seller-scoped draft product with a localized translation', async () => {
    const repo = new MemoryProductRepository();
    const outbox = new MemoryOutboxRepository();
    const useCase = new CreateProductUseCase(repo, outbox);

    const result = await useCase.execute({
      sellerId: 'seller-1',
      sellerName: 'Test Shop',
      locale: 'es',
      name: 'Camiseta personalizada',
      description: 'Camiseta para diseñar',
      price: 19.99,
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: 'https://cdn.example.com/shirt.png',
        textOffset: { x: 12, y: 18 },
        imageOffset: { x: 22, y: 30 },
      },
    });

    const saved = await repo.findById(result.id, 'es');

    expect(result.id).toBeDefined();
    expect(result.basePrice).toEqual(ProductPrice.create(19.99, Currency.EUR));
    expect(result.status).toBe(ProductStatus.DRAFT);
    expect(saved?.translations[0]).toMatchObject({
      locale: 'es',
      name: 'Camiseta personalizada',
      description: 'Camiseta para diseñar',
    });
    expect(saved?.customizationConfig?.mode).toBe('text_photo');
    expect(outbox.events).toEqual([
      {
        eventType: GlobalEvents.PRODUCT_CREATED,
        payload: {
          productId: result.id,
          sellerId: 'seller-1',
          status: ProductStatus.DRAFT,
        },
      },
    ]);
  });

  it('rejects missing product name', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'es',
        name: '   ',
        description: 'Desc',
        price: 19.99,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects non-positive prices', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'es',
        name: 'Producto',
        description: 'Desc',
        price: 0,
      }),
    ).rejects.toThrow('ProductPrice amount must be greater than zero');
  });
});
