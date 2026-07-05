import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const findByIdMock = vi.fn();

  return { getSessionMock, findByIdMock };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getSessionMock,
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: vi.fn().mockResolvedValue({
    orders: {
      status: 'Status',
      total: 'Total',
      retryPayment: 'Retry payment',
    },
  }),
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getOrderRepository: () => ({
      findById: mocks.findByIdMock,
    }),
  },
}));

import OrderDetailPage from '@/app/[locale]/orders/[orderId]/page';

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.findByIdMock.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      checkoutGroupId: 'checkout-group-1',
      checkoutGroupPaymentStatus: 'failed',
      total: 42,
      status: 'new',
      lineItems: [],
    });
  });

  it('shows the order details and retry CTA for checkout-group orders', async () => {
    const element = await OrderDetailPage({
      params: Promise.resolve({ locale: 'es', orderId: 'order-1' }),
    });

    render(element);

    expect(
      screen.getByRole('heading', { name: /order-1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry payment' }),
    ).toBeInTheDocument();
  });

  it('hides retry when the checkout-group payment is completed', async () => {
    mocks.findByIdMock.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      checkoutGroupId: 'checkout-group-1',
      checkoutGroupPaymentStatus: 'completed',
      total: 42,
      status: 'new',
      lineItems: [],
    });

    const element = await OrderDetailPage({
      params: Promise.resolve({ locale: 'es', orderId: 'order-1' }),
    });

    render(element);

    expect(screen.queryByRole('button', { name: 'Retry payment' })).toBeNull();
  });
});
