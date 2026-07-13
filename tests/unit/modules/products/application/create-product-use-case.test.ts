import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { CreateProductUseCase } from '@/modules/products/application/create-product-use-case';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
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
    const images = [
      {
        url: 'http://localhost:8081/products/camiseta-roja.png',
        alt: 'Rojo cereza',
        purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
        mimeType: 'image/png',
        posterUrl: null,
      },
    ] satisfies Array<{
      url: string;
      alt: string;
      purpose: ProductImagePurpose;
      mimeType: string;
      posterUrl: null;
    }>;

    const result = await useCase.execute({
      sellerId: 'seller-1',
      sellerName: 'Test Shop',
      locale: 'es',
      name: 'Camiseta personalizada',
      description: 'Camiseta para diseñar',
      price: 19.99,
      images,
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: 'https://cdn.example.com/shirt.png',
        textOffset: { x: 12, y: 18 },
        imageOffset: { x: 22, y: 30 },
      },
      translation: {
        tags: ['ropa', 'verano'],
        sizes: ['S', 'M', 'L'],
        designChangeDescription: 'Cambia el estampado frontal',
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
      tags: ['ropa', 'verano'],
      sizes: ['S', 'M', 'L'],
      designChangeDescription: 'Cambia el estampado frontal',
    });
    expect(saved?.customizationConfig?.mode).toBe('text_photo');
    expect(saved?.images).toHaveLength(1);
    expect(saved?.images[0]).toMatchObject({
      url: 'http://localhost:8081/products/camiseta-roja.png',
      alt: 'Rojo cereza',
      position: 0,
      purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
      mimeType: 'image/png',
      posterUrl: null,
    });
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

  it('persists multiple locale translations when provided', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);

    const result = await useCase.execute({
      sellerId: 'seller-1',
      sellerName: 'Test Shop',
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Camiseta personalizada',
          description: 'Camiseta para diseñar',
          tags: ['ropa', 'verano'],
          sizes: ['S', 'M', 'L'],
          designChangeDescription: 'Cambia el estampado frontal',
        },
        {
          locale: 'cat',
          name: 'Samarreta personalitzada',
          description: 'Samarreta per dissenyar',
          tags: ['roba'],
          sizes: ['M'],
          designChangeDescription: 'Canvia el frontal',
        },
      ],
    });

    const saved = await repo.findById(result.id, 'cat');

    expect(saved?.translations).toHaveLength(2);
    expect(saved?.translations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'es',
          name: 'Camiseta personalizada',
        }),
        expect.objectContaining({
          locale: 'cat',
          name: 'Samarreta personalitzada',
        }),
      ]),
    );
  });

  it('preserves photo labels and defaults absent labels to an empty map', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);
    const result = await useCase.execute({
      sellerId: 'seller-1',
      sellerName: 'Test Shop',
      price: 10,
      translations: [
        { locale: 'es', name: 'Producto', photoLabels: { 'img-1': 'Frontal' } },
        { locale: 'cat', name: 'Producte' },
      ],
    });
    const saved = await repo.findById(result.id, 'es');
    expect(saved?.translations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'es',
          photoLabels: { 'img-1': 'Frontal' },
        }),
        expect.objectContaining({ locale: 'cat', photoLabels: {} }),
      ]),
    );
  });

  it('rejects missing product name', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'es',
        name: ' '.repeat(3),
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

  it('rejects creating an ACTIVE product without an es translation', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'cat',
        name: 'Samarreta',
        description: 'Desc',
        price: 19.99,
        status: ProductStatus.ACTIVE,
        translation: {
          tags: [],
          sizes: [],
          designChangeDescription: null,
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects more than one COVER image', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);
    const images = [
      {
        url: 'http://localhost:8081/products/cover-1.png',
        alt: 'Cover 1',
        purpose: ProductImagePurpose.COVER,
        mimeType: 'image/jpeg',
      },
      {
        url: 'http://localhost:8081/products/cover-2.png',
        alt: 'Cover 2',
        purpose: ProductImagePurpose.COVER,
        mimeType: 'image/png',
      },
    ] satisfies Array<{
      url: string;
      alt: string;
      purpose: ProductImagePurpose;
      mimeType: string;
    }>;

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'es',
        name: 'Producto',
        description: 'Desc',
        price: 19.99,
        images,
      }),
    ).rejects.toThrow(/only one cover/i);
  });

  it('rejects invalid purpose and MIME pairs', async () => {
    const repo = new MemoryProductRepository();
    const useCase = new CreateProductUseCase(repo);
    const images = [
      {
        url: 'http://localhost:8081/products/base.webm',
        alt: 'Base video',
        purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
        mimeType: 'video/webm',
      },
    ] satisfies Array<{
      url: string;
      alt: string;
      purpose: ProductImagePurpose;
      mimeType: string;
    }>;

    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        locale: 'es',
        name: 'Producto',
        description: 'Desc',
        price: 19.99,
        images,
      }),
    ).rejects.toThrow(/CUSTOMIZABLE_BASE/);
  });
});
