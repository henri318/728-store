import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  const getSellerRepositoryMock = vi.fn();
  const getSessionMock = vi.fn();

  return {
    getDictionaryMock,
    getProductRepositoryMock,
    getSellerRepositoryMock,
    getSessionMock,
  };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
    getSellerRepository: mocks.getSellerRepositoryMock,
    getSession: () => ({
      getSession: mocks.getSessionMock,
    }),
  },
}));

import SellerProductsPage from '@/app/[locale]/seller/products/page';
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
    common: {
      loading: 'Loading...',
    },
    admin: {
      productName: 'Product',
      productStatus: 'Status',
      productPrice: 'Price',
      productUpdated: 'Updated',
      actions: 'Actions',
      editProduct: 'Edit product',
      createProduct: 'Create product',
      untranslatedProduct: 'Untranslated',
      paginationAriaLabel: 'Page navigation',
      pagePrev: '← Previous',
      pageNext: 'Next →',
      pageXofY: 'Page {current} of {total}',
      searchProductsPlaceholder: 'Search products...',
      status_draft: 'Draft',
      status_active: 'Active',
      status_archived: 'Archived',
      suspendProduct: 'Suspend',
      activateProduct: 'Activate',
    },
    sellerDashboard: {
      title: 'Seller products',
      noProducts: 'No products found',
      searchProducts: 'Search products',
      searchPlaceholder: 'Search products...',
      createProduct: 'Create product',
      editProduct: 'Edit product',
      backToProducts: 'Back to products',
      productNameLabel: 'Name',
      productDescriptionLabel: 'Description',
      productPriceLabel: 'Price',
      productStatusLabel: 'Status',
      productCustomizationConfigLabel: 'Customization config',
      productCustomizationConfigHint: 'Paste the JSON config here.',
      productSaved: 'Saved',
      productFormError: 'Unable to save product',
      createProductTitle: 'Create product',
      editProductTitle: 'Edit product',
      statusDraft: 'Draft',
      statusActive: 'Active',
      statusArchived: 'Archived',
      statusEliminated: 'Eliminated',
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('SellerProductsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDictionaryMock.mockResolvedValue(makeDict());
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
  });

  it('passes query params to the product listing and renders rows', async () => {
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

    const element = await SellerProductsPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({ q: 'taza', page: '1', pageSize: '5' }),
    });
    render(element);

    expect(
      screen.getByRole('heading', { name: 'Seller products' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Create product' }),
    ).toHaveAttribute('href', '/es/seller/products/new');
    expect(spy).toHaveBeenCalledWith({
      q: 'taza',
      page: 1,
      pageSize: 5,
      sellerId: 'seller-1',
      lang: 'es',
      sortBy: 'createdAt',
      sortDir: 'desc',
    });
    expect(
      screen.getByRole('searchbox', { name: 'Search products' }),
    ).toHaveValue('taza');
    expect(screen.getByText('Taza')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit product' })).toHaveAttribute(
      'href',
      '/es/seller/products/p-1/edit',
    );
    expect(
      screen.getByRole('button', { name: 'Suspender' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Search products' }),
    ).toBeInTheDocument();
  });

  it('renders pagination controls when products exist', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct({ id: 'p-1' }),
      makeProduct({ id: 'p-2' }),
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

    const element = await SellerProductsPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({ page: '1', pageSize: '2' }),
    });
    render(element);

    expect(
      screen.getByRole('navigation', { name: 'Page navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('← Previous')).toHaveTextContent('← Previous');
    expect(screen.getByText('← Previous').tagName).toBe('SPAN');
    expect(screen.getByRole('link', { name: 'Next →' })).toHaveAttribute(
      'href',
      '/es/seller/products?page=2&pageSize=2',
    );
  });

  it('clamps out-of-range pagination before rendering navigation', async () => {
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

    const element = await SellerProductsPage({
      params: Promise.resolve({ locale: 'cat' }),
      searchParams: Promise.resolve({ page: '99', pageSize: '2' }),
    });
    render(element);

    expect(screen.getByRole('link', { name: '← Previous' })).toHaveAttribute(
      'href',
      '/cat/seller/products?pageSize=2',
    );
    expect(screen.getByText('Next →').tagName).toBe('SPAN');
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

    const element = await SellerProductsPage({
      params: Promise.resolve({ locale: 'cat' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search products' }),
    ).toBeInTheDocument();
  });

  it('falls back to the empty state when the seller is not linked', async () => {
    const productRepo = new MemoryProductRepository();
    const spy = vi.spyOn(productRepo, 'findPaginated');
    mocks.getProductRepositoryMock.mockReturnValue(productRepo);

    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue(null),
    });

    const element = await SellerProductsPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('rethrows non-NotFound errors from the seller lookup', async () => {
    mocks.getProductRepositoryMock.mockReturnValue(
      new MemoryProductRepository(),
    );
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      SellerProductsPage({
        params: Promise.resolve({ locale: 'es' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('boom');
  });
});
