import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

const mocks = vi.hoisted(() => {
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  return { getDictionaryMock, getProductRepositoryMock };
});

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
    getSession: () => ({
      getSession: vi.fn().mockResolvedValue(null),
    }),
    getOutboxRepository: () => ({}),
  },
}));

vi.mock('@/components/cart/add-to-cart-button', () => ({
  AddToCartButton: () => <button type="button">Add to cart</button>,
}));

vi.mock('@/components/products/search-input-with-suggestions', () => ({
  SearchInputWithSuggestions: () => <div data-testid="search-input" />,
}));

vi.mock('@/components/products/infinite-product-list', () => ({
  InfiniteProductList: ({
    initialItems,
  }: {
    initialItems: Array<{
      id?: string;
      translations?: Array<{ name?: string }>;
      images?: Array<{ url?: string; alt?: string }>;
    }>;
  }) => (
    <div>
      {initialItems.map((item) => (
        <div key={item.id ?? item.translations?.[0]?.name ?? ''}>
          <span>{item.translations?.[0]?.name ?? 'Unknown'}</span>
          {item.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={item.images[0]?.alt ?? ''} src={item.images[0].url} />
          ) : null}
        </div>
      ))}
    </div>
  ),
}));

import HomePage from '@/app/[locale]/page';

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDictionaryMock.mockResolvedValue({
      common: {
        heroImageAlt: 'Hero',
        products: 'Products',
        noProducts: 'No products',
        viewDetails: 'View details',
        addToCart: 'Add to cart',
        removeFromCart: 'Remove from cart',
        slogan: 'Siete 28',
      },
    });
  });

  it('shows only active products and their preview images', async () => {
    mocks.getProductRepositoryMock.mockReturnValue({
      findPaginated: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'active-1',
            basePrice: ProductPrice.create(15, Currency.EUR),
            sellerId: 'seller-1',
            sellerName: '728 Store',
            status: ProductStatus.ACTIVE,
            categoryId: null,
            category: null,
            customizationConfig: null,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-02T00:00:00.000Z'),
            translations: [
              { locale: 'es', name: 'Taza personalizada', description: 'Taza' },
            ],
            images: [
              {
                id: 'img-1',
                url: 'http://assets.example.test/products/taza.png',
                alt: 'Taza personalizada',
                position: 0,
                productId: 'active-1',
                createdAt: new Date('2025-01-01T00:00:00.000Z'),
              },
            ],
            tags: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      }),
    });

    const element = await HomePage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });

    render(element);

    expect(screen.getByText('Taza personalizada')).toBeInTheDocument();
    expect(screen.getByAltText('Taza personalizada')).toHaveAttribute(
      'src',
      'http://assets.example.test/products/taza.png',
    );
    expect(screen.queryByText('Borrador')).toBeNull();
  });
});
