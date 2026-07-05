import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const findByIdMock = vi.fn();
  const findActiveByUserIdMock = vi.fn();
  const findByIdsMock = vi.fn();
  const countPaidOrdersByUserIdMock = vi.fn();
  const findUserByIdMock = vi.fn();
  const checkoutConfirmButtonMock = vi.fn();

  return {
    getSessionMock,
    findByIdMock,
    findActiveByUserIdMock,
    findByIdsMock,
    countPaidOrdersByUserIdMock,
    findUserByIdMock,
    checkoutConfirmButtonMock,
  };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getSessionMock,
}));

vi.mock(
  '@/modules/cart/presentation/components/checkout-confirm-button',
  () => ({
    CheckoutConfirmButton: (props: unknown) => {
      mocks.checkoutConfirmButtonMock(props);
      return <div data-testid="checkout-confirm-button" />;
    },
  }),
);

vi.mock('@/composition-root/container', () => ({
  container: {
    getCartRepository: () => ({
      findActiveByUserId: mocks.findActiveByUserIdMock,
    }),
    getCustomizationLookup: () => ({
      findByIds: mocks.findByIdsMock,
    }),
    getProductRepository: () => ({
      findById: mocks.findByIdMock,
    }),
    getPaidOrderCountPort: () => ({
      countPaidOrdersByUserId: mocks.countPaidOrdersByUserIdMock,
    }),
    getUserRepository: () => ({
      findById: mocks.findUserByIdMock,
    }),
  },
}));

import CheckoutPage from '@/app/[locale]/checkout/page';

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.findActiveByUserIdMock.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'cart-item-1',
          productId: { value: 'product-1' },
          sellerId: { value: 'seller-1' },
          quantity: 1,
          unitPriceSnapshot: { amount: 10, currency: 'EUR' },
          customizationIdList: [],
        },
      ],
    });
    mocks.findByIdsMock.mockResolvedValue([]);
    mocks.findByIdMock.mockResolvedValue({
      id: 'product-1',
      sellerName: 'Seller One',
      translations: [{ locale: 'es', name: 'Product One' }],
      images: [],
    });
    mocks.countPaidOrdersByUserIdMock.mockResolvedValue(0);
  });

  it('passes the saved customer address into the checkout button', async () => {
    mocks.findUserByIdMock.mockResolvedValue({
      address: {
        street: 'Main St 1',
        city: 'Madrid',
        postalCode: '28001',
        country: 'ES',
      },
    });

    const element = await CheckoutPage({
      params: Promise.resolve({ locale: 'es' }),
    });

    render(element as never);
    expect(mocks.checkoutConfirmButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es',
        initialAddress: {
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        },
      }),
    );
  });

  it('keeps checkout button usable when the profile has no address', async () => {
    mocks.findUserByIdMock.mockResolvedValue({ address: null });

    const element = await CheckoutPage({
      params: Promise.resolve({ locale: 'cat' }),
    });

    render(element as never);
    expect(mocks.checkoutConfirmButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'cat',
        initialAddress: null,
      }),
    );
  });
});
