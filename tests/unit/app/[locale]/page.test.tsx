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
  },
}));

vi.mock('@/components/cart/add-to-cart-button', () => ({
  AddToCartButton: () => <button type="button">Add to cart</button>,
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
      findAll: vi.fn().mockResolvedValue([
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
        {
          id: 'draft-1',
          basePrice: ProductPrice.create(10, Currency.EUR),
          sellerId: 'seller-1',
          sellerName: '728 Store',
          status: ProductStatus.DRAFT,
          categoryId: null,
          category: null,
          customizationConfig: null,
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
          updatedAt: new Date('2025-01-04T00:00:00.000Z'),
          translations: [
            { locale: 'es', name: 'Borrador', description: 'Invisible' },
          ],
          images: [],
          tags: [],
        },
      ]),
    });

    const element = await HomePage({
      params: Promise.resolve({ locale: 'es' }),
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
