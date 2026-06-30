import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';

const mocks = vi.hoisted(() => {
  const txMock = {
    product: {
      update: vi.fn(),
    },
    productTranslation: {
      upsert: vi.fn(),
    },
  };

  const prismaMock = {
    product: {
      create: vi.fn(),
      update: vi.fn(),
    },
    productTranslation: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(
      async (input: (tx: typeof txMock) => Promise<unknown>) => input(txMock),
    ),
  };

  return { txMock, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: mocks.prismaMock,
}));

function makeProduct(overrides: Partial<ProductEntity> = {}): ProductEntity {
  return {
    id: 'product-1',
    basePrice: ProductPrice.create(25, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.DRAFT,
    categoryId: 'category-1',
    category: null,
    customizationConfig: ProductCustomizationConfig.fromJson({
      mode: 'text_photo',
      previewEnabled: true,
      previewTemplateUrl: 'https://cdn.example.com/mock.png',
      textOffset: { x: 12, y: 20 },
      imageOffset: { x: 18, y: 30 },
    }),
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [
      { locale: 'es', name: 'Camiseta', description: 'Camiseta base' },
      { locale: 'cat', name: 'Samarreta', description: 'Samarreta base' },
    ],
    images: [],
    tags: [],
    ...overrides,
  };
}

describe('PrismaProductRepository', () => {
  let repo: PrismaProductRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaProductRepository();
  });

  it('persists translations and customization config when saving', async () => {
    const product = makeProduct();
    mocks.prismaMock.product.create.mockResolvedValue({ id: product.id });

    await repo.save(product);

    expect(mocks.prismaMock.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'product-1',
        basePrice: 25,
        currency: 'EUR',
        sellerId: 'seller-1',
        status: ProductStatus.DRAFT,
        categoryId: 'category-1',
        customizationConfig: {
          mode: 'text_photo',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/mock.png',
          textOffset: { x: 12, y: 20 },
          imageOffset: { x: 18, y: 30 },
        },
        translations: {
          create: [
            { locale: 'es', name: 'Camiseta', description: 'Camiseta base' },
            { locale: 'cat', name: 'Samarreta', description: 'Samarreta base' },
          ],
        },
      }),
    });
  });

  it('updates scalar fields and upserts translated rows', async () => {
    const product = makeProduct({
      basePrice: ProductPrice.create(32, Currency.EUR),
      status: ProductStatus.ACTIVE,
      translations: [
        { locale: 'es', name: 'Taza personalizada', description: 'Nueva' },
      ],
    });

    mocks.txMock.product.update.mockResolvedValue({ id: product.id });
    mocks.txMock.productTranslation.upsert.mockResolvedValue({ id: 't-1' });

    await repo.update(product);

    expect(mocks.prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txMock.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: expect.objectContaining({
        basePrice: 32,
        currency: 'EUR',
        status: ProductStatus.ACTIVE,
        categoryId: 'category-1',
        customizationConfig: {
          mode: 'text_photo',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/mock.png',
          textOffset: { x: 12, y: 20 },
          imageOffset: { x: 18, y: 30 },
        },
        updatedAt: product.updatedAt,
      }),
    });
    expect(mocks.txMock.productTranslation.upsert).toHaveBeenCalledWith({
      where: {
        productId_locale: { productId: 'product-1', locale: 'es' },
      },
      create: {
        productId: 'product-1',
        locale: 'es',
        name: 'Taza personalizada',
        description: 'Nueva',
      },
      update: {
        name: 'Taza personalizada',
        description: 'Nueva',
      },
    });
  });
});
