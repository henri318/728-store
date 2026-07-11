import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

const mocks = vi.hoisted(() => {
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  const infiniteProductListMock = vi.fn(
    ({
      initialItems,
    }: {
      initialItems: Array<{
        id: string;
        cover?: { url: string; alt: string | null };
        images?: unknown;
      }>;
    }) => (
      <div data-testid="infinite-list">
        {initialItems.map((item) => (
          <div key={item.id}>
            <span>{item.cover?.alt ?? 'No cover'}</span>
            {item.cover?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.cover.alt ?? ''} src={item.cover.url} />
            ) : null}
          </div>
        ))}
      </div>
    ),
  );
  return {
    getDictionaryMock,
    getProductRepositoryMock,
    infiniteProductListMock,
  };
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

vi.mock('@/modules/cart/presentation/components/add-to-cart-button', () => ({
  AddToCartButton: () => <button type="button">Add to cart</button>,
}));

vi.mock('@/components/products/search-input-with-suggestions', () => ({
  SearchInputWithSuggestions: () => <div data-testid="search-input" />,
}));

vi.mock('@/components/products/infinite-product-list', () => ({
  InfiniteProductList: mocks.infiniteProductListMock,
}));

import HomePage from '@/app/[locale]/page';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue({
      common: {
        heroImageAlt: 'Hero',
        products: 'Products',
        noProducts: 'No products',
        noImageAvailable: 'Image not available',
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
                url: 'https://assets.example.test/products/taza.png',
                alt: 'Taza personalizada',
                position: 0,
                purpose: ProductImagePurpose.COVER,
                mimeType: 'image/jpeg',
                posterUrl: null,
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
      'https://assets.example.test/products/taza.png',
    );

    const infiniteListProps = mocks.infiniteProductListMock.mock
      .calls[0][0] as {
      initialItems: Array<{
        cover?: { url: string; alt: string | null };
        images?: unknown;
      }>;
    };
    expect(infiniteListProps.initialItems[0].cover).toEqual({
      url: 'https://assets.example.test/products/taza.png',
      alt: 'Taza personalizada',
    });
    expect(infiniteListProps.initialItems[0]).not.toHaveProperty('images');
  });
});
