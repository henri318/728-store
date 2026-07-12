import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { UpdateProductUseCase } from '@/modules/products/application/update-product-use-case';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
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
    repo.seed([
      makeProduct({
        images: [
          {
            id: 'img-1',
            url: 'http://localhost:8081/products/taza-original.png',
            alt: 'Taza original',
            position: 0,
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
            mimeType: 'image/png',
            posterUrl: null,
            productId: 'p-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
      }),
    ]);
    const outbox = new MemoryOutboxRepository();
    const useCase = new UpdateProductUseCase(repo, outbox);
    const images = [
      {
        url: 'http://localhost:8081/products/taza-nueva.png',
        alt: 'Verde bosque',
      },
    ] satisfies Array<{
      url: string;
      alt: string;
    }>;

    const result = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      locale: 'es',
      name: 'Taza personalizada',
      description: 'Nueva descripción',
      price: 14.5,
      status: ProductStatus.ARCHIVED,
      images,
      customizationConfig: {
        mode: 'photo',
        previewEnabled: true,
        previewTemplateUrl: 'https://cdn.example.com/mug.png',
        textOffset: null,
        imageOffset: { x: 5, y: 8 },
      },
      translation: {
        tags: ['ceramica'],
        sizes: ['M', 'L'],
        designChangeDescription: 'Mantén el texto base',
        customizationInstructions: 'Configura el texto en el frontal',
      },
    });

    const saved = await repo.findById('p-1', 'es');

    expect(result.status).toBe(ProductStatus.ARCHIVED);
    expect(result.updatedAt.toISOString()).toBe('2025-02-01T12:00:00.000Z');
    expect(saved?.translations[0]).toMatchObject({
      locale: 'es',
      name: 'Taza personalizada',
      description: 'Nueva descripción',
      tags: ['ceramica'],
      sizes: ['M', 'L'],
      designChangeDescription: 'Mantén el texto base',
      customizationInstructions: 'Configura el texto en el frontal',
    });
    expect(saved?.basePrice.amount).toBe(14.5);
    expect(saved?.customizationConfig?.mode).toBe('photo');
    expect(saved?.images).toHaveLength(1);
    expect(saved?.images[0]).toMatchObject({
      url: 'http://localhost:8081/products/taza-nueva.png',
      alt: 'Verde bosque',
      position: 0,
      purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
      mimeType: 'image/png',
      posterUrl: null,
    });
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

  it('upserts all submitted locale translations in one save', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct()]);
    const useCase = new UpdateProductUseCase(repo);

    const result = await useCase.execute({
      productId: 'p-1',
      sellerId: 'seller-1',
      price: 16.5,
      translations: [
        {
          locale: 'es',
          name: 'Taza nueva',
          description: 'Nueva descripción',
          tags: ['ceramica'],
          sizes: ['M'],
          designChangeDescription: 'Mantén el texto base',
        },
        {
          locale: 'cat',
          name: 'Tassa nova',
          description: 'Nova descripció',
          tags: ['ceràmica'],
          sizes: ['L'],
          designChangeDescription: 'Mantén el text base',
          customizationInstructions: 'Configura el text al frontal',
        },
      ],
    });

    const saved = await repo.findById('p-1', 'cat');

    expect(result.basePrice.amount).toBe(16.5);
    expect(saved?.translations).toHaveLength(2);
    expect(saved?.translations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'es',
          name: 'Taza nueva',
          customizationInstructions: 'Configura el texto en el frontal',
        }),
        expect.objectContaining({ locale: 'cat', name: 'Tassa nova' }),
      ]),
    );
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

  it('rejects activating a product without an es translation', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct({
        status: ProductStatus.DRAFT,
        translations: [
          { locale: 'cat', name: 'Samarreta', description: 'Una samarreta' },
        ],
      }),
    ]);
    const useCase = new UpdateProductUseCase(repo);

    await expect(
      useCase.execute({
        productId: 'p-1',
        sellerId: 'seller-1',
        locale: 'cat',
        status: ProductStatus.ACTIVE,
        translation: {
          tags: [],
          sizes: [],
          designChangeDescription: null,
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects more than one COVER image when replacing images', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct()]);
    const useCase = new UpdateProductUseCase(repo);
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
        productId: 'p-1',
        sellerId: 'seller-1',
        locale: 'es',
        images,
      }),
    ).rejects.toThrow(/only one cover/i);
  });

  it('rejects invalid purpose and MIME pairs when replacing images', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct()]);
    const useCase = new UpdateProductUseCase(repo);
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
        productId: 'p-1',
        sellerId: 'seller-1',
        locale: 'es',
        images,
      }),
    ).rejects.toThrow(/CUSTOMIZABLE_BASE/);
  });
});
