import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const findByIdMock = vi.fn();
  const findActiveByUserIdMock = vi.fn();
  const findByIdsMock = vi.fn();
  const countPaidOrdersByUserIdMock = vi.fn();
  const getUserProfileMock = vi.fn();
  const checkoutConfirmButtonMock = vi.fn();

  return {
    getSessionMock,
    findByIdMock,
    findActiveByUserIdMock,
    findByIdsMock,
    countPaidOrdersByUserIdMock,
    getUserProfileMock,
    checkoutConfirmButtonMock,
  };
});

vi.mock('server-only', () => ({}));

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
    getUserProfileUseCase: () => ({ execute: mocks.getUserProfileMock }),
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
    mocks.getUserProfileMock.mockResolvedValue({
      deliveryAddress: {
        street: 'Main St 1',
        houseNumber: '12',
        city: 'Madrid',
        postalCode: '28001',
        country: 'Espana',
        countryCode: 'ES',
        floor: '3',
        door: 'B',
        instructions: 'Llamar al timbre',
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
          houseNumber: '12',
          city: 'Madrid',
          postalCode: '28001',
          country: 'Espana',
          countryCode: 'ES',
          floor: '3',
          door: 'B',
          instructions: 'Llamar al timbre',
        },
      }),
    );
  });

  it('keeps checkout button usable when the profile has no address', async () => {
    mocks.getUserProfileMock.mockResolvedValue({ deliveryAddress: null });

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
