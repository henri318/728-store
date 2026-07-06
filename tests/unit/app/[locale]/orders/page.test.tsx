import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const orderExecuteMock = vi.fn();

  return { getSessionMock, orderExecuteMock };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getSessionMock,
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: vi.fn().mockResolvedValue({
    orders: {
      title: 'My orders',
      retryPayment: 'Retry payment',
      viewOrder: 'View order',
      noOrders: 'No orders yet',
    },
    common: {
      loading: 'Loading...',
      submit: 'Submit',
    },
  }),
}));

vi.mock('@/modules/orders/application/list-customer-orders-use-case', () => ({
  ListCustomerOrdersUseCase: class {
    async execute(input: unknown) {
      return mocks.orderExecuteMock(input);
    }
  },
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getOrderRepository: () => ({}),
  },
}));

import CustomerOrdersPage from '@/app/[locale]/orders/page';

describe('CustomerOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.orderExecuteMock.mockResolvedValue({
      items: [
        {
          id: 'order-1',
          checkoutGroupId: 'checkout-group-1',
          checkoutGroupPaymentStatus: 'failed',
          total: 42,
          status: 'new',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it('lists the customer orders and exposes retry by checkout-group', async () => {
    const element = await CustomerOrdersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });

    render(element);

    expect(
      screen.getByRole('heading', { name: 'My orders' }),
    ).toBeInTheDocument();
    expect(mocks.orderExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sortBy: 'createdAt',
        sortDir: 'desc',
      }),
    );
    expect(
      screen.getByRole('link', { name: 'View order' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry payment' }),
    ).toBeInTheDocument();
  });

  it('hides retry when the checkout-group payment is not failed', async () => {
    mocks.orderExecuteMock.mockResolvedValueOnce({
      items: [
        {
          id: 'order-1',
          checkoutGroupId: 'checkout-group-1',
          checkoutGroupPaymentStatus: 'completed',
          total: 42,
          status: 'new',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const element = await CustomerOrdersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });

    render(element);

    expect(screen.queryByRole('button', { name: 'Retry payment' })).toBeNull();
  });
});
