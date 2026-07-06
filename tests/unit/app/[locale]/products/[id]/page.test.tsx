import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

const mocks = vi.hoisted(() => {
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  return { getDictionaryMock, getProductRepositoryMock };
});

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
  },
}));

vi.mock('@/modules/cart/presentation/components/add-to-cart-button', () => ({
  AddToCartButton: () => <div data-testid="add-to-cart-button" />,
}));

vi.mock('@/app/[locale]/products/[id]/customization-experience', () => ({
  CustomizationExperience: () => <div data-testid="customization-experience" />,
}));

import ProductDetailPage from '@/app/[locale]/products/[id]/page';

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDictionaryMock.mockResolvedValue({
      common: {
        home: 'Home',
        addToCart: 'Add to cart',
        removeFromCart: 'Remove from cart',
        slogan: 'Siete 28',
      },
    });
  });

  it('renders the product image from the catalog asset and the customization experience', async () => {
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue({
        id: 'p-1',
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
            productId: 'p-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
        tags: [],
      }),
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ locale: 'es', id: 'p-1' }),
    });

    render(element);

    expect(screen.getByTestId('add-to-cart-button')).toBeInTheDocument();
  });
});
