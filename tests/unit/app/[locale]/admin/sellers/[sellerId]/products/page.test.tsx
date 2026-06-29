import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const assertRoleMock = vi.fn(async () => undefined);
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  const getSellerRepositoryMock = vi.fn();

  return {
    assertRoleMock,
    getDictionaryMock,
    getProductRepositoryMock,
    getSellerRepositoryMock,
  };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/shared/authorization/authorization', () => ({
  assertRole: mocks.assertRoleMock,
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
    getSellerRepository: mocks.getSellerRepositoryMock,
  },
}));

import AdminSellerProductsPage from '@/app/[locale]/admin/sellers/[sellerId]/products/page';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

function makeProduct(overrides: Partial<ProductEntity> = {}): ProductEntity {
  return {
    id: 'p-1',
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    translations: [
      { locale: 'es', name: 'Taza', description: 'Una taza' },
      { locale: 'cat', name: 'Tassa', description: 'Una tassa' },
    ],
    images: [],
    tags: [],
    ...overrides,
  };
}

function makeSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Tienda Prueba',
    description: 'Descripción de prueba',
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeDict() {
  return {
    admin: {
      backToSellers: 'Back to sellers',
      sellerProductsTitle: 'Seller products',
      noProducts: 'No products found',
      productName: 'Product',
      productStatus: 'Status',
      productPrice: 'Price',
      productUpdated: 'Updated',
      pagePrev: '← Previous',
      pageNext: 'Next →',
      pageXofY: 'Page {current} of {total}',
      searchProducts: 'Find products',
      searchProductsPlaceholder: 'Find products placeholder',
      productCount: '{total} items',
      untranslatedProduct: 'No translation',
      paginationAriaLabel: 'Page navigation',
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('AdminSellerProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue(makeDict());
  });

  it('passes query params to the product list and renders the search form', async () => {
    const repo = new MemoryProductRepository();
    const spy = vi.spyOn(repo, 'findPaginated');
    repo.seed([makeProduct()]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const sellerRepo = new MemorySellerRepository();
    sellerRepo.seed(
      makeSeller({
        sellerId: SellerId.create('seller-1'),
        name: 'Tienda Prueba',
      }),
    );
    mocks.getSellerRepositoryMock.mockReturnValue(sellerRepo);

    const element = await AdminSellerProductsPage({
      params: Promise.resolve({ locale: 'es', sellerId: 'seller-1' }),
      searchParams: Promise.resolve({ q: 'taza', page: '2', pageSize: '5' }),
    });
    render(element);

    expect(
      screen.getByRole('heading', { name: 'Seller products: Tienda Prueba' }),
    ).toBeInTheDocument();

    expect(spy).toHaveBeenCalledWith({
      q: 'taza',
      page: 2,
      pageSize: 5,
      sellerId: 'seller-1',
      lang: 'es',
      sortBy: 'createdAt',
      sortDir: 'desc',
    });
    const searchbox = screen.getByRole('searchbox', { name: 'Find products' });
    expect(searchbox).toHaveValue('taza');
    expect(searchbox).toHaveAttribute(
      'placeholder',
      'Find products placeholder',
    );
    expect(
      screen.getByRole('button', { name: 'Find products' }),
    ).toBeInTheDocument();
  });

  it('renders paginated products and preserves seller scope in navigation links', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct({ id: 'p-1' }),
      makeProduct({ id: 'p-2', translations: [] }),
      makeProduct({ id: 'p-3' }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const sellerRepo = new MemorySellerRepository();
    sellerRepo.seed(
      makeSeller({
        sellerId: SellerId.create('seller-1'),
        name: 'Tienda Prueba',
      }),
    );
    mocks.getSellerRepositoryMock.mockReturnValue(sellerRepo);

    const element = await AdminSellerProductsPage({
      params: Promise.resolve({ locale: 'cat', sellerId: 'seller-1' }),
      searchParams: Promise.resolve({ page: '1', pageSize: '2' }),
    });
    render(element);

    expect(
      screen.getByRole('heading', { name: 'Seller products: Tienda Prueba' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Tassa')).toBeInTheDocument();
    expect(screen.getByText('No translation')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Page navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next →' })).toHaveAttribute(
      'href',
      '/cat/admin/sellers/seller-1/products?page=2&pageSize=2',
    );
  });

  it('clamps out-of-range pagination before rendering page info', async () => {
    const productRepo = {
      findPaginated: vi.fn().mockResolvedValue({
        items: [makeProduct()],
        total: 3,
        page: 99,
        pageSize: 2,
        totalPages: 2,
      }),
    };
    mocks.getProductRepositoryMock.mockReturnValue(productRepo);

    const sellerRepo = new MemorySellerRepository();
    sellerRepo.seed(
      makeSeller({
        sellerId: SellerId.create('seller-1'),
        name: 'Tienda Prueba',
      }),
    );
    mocks.getSellerRepositoryMock.mockReturnValue(sellerRepo);

    const element = await AdminSellerProductsPage({
      params: Promise.resolve({ locale: 'es', sellerId: 'seller-1' }),
      searchParams: Promise.resolve({ page: '99', pageSize: '2' }),
    });
    render(element);

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Previous' })).toHaveAttribute(
      'href',
      '/es/admin/sellers/seller-1/products?pageSize=2',
    );
  });

  it('renders the empty state when the seller has no products', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const sellerRepo = new MemorySellerRepository();
    sellerRepo.seed(
      makeSeller({
        sellerId: SellerId.create('seller-1'),
        name: 'Tienda Prueba',
      }),
    );
    mocks.getSellerRepositoryMock.mockReturnValue(sellerRepo);

    const element = await AdminSellerProductsPage({
      params: Promise.resolve({ locale: 'es', sellerId: 'seller-1' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(
      screen.getByRole('heading', { name: 'Seller products: Tienda Prueba' }),
    ).toBeInTheDocument();

    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to sellers' }),
    ).toHaveAttribute('href', '/es/admin/sellers');
  });
});
