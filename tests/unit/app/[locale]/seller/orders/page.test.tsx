import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const sellerFindByUserIdMock = vi.fn();
  const orderExecuteMock = vi.fn();

  return {
    getSessionMock,
    sellerFindByUserIdMock,
    orderExecuteMock,
  };
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
    sellerDashboard: {
      title: 'Seller orders',
      status: 'Status',
      createdAt: 'Date',
      total: 'Total',
      actions: 'Actions',
      noOrders: 'No orders yet',
      filterStatus: 'Filter status',
      sortBy: 'Sort by',
      sortByCreatedAt: 'Date',
      sortAscending: 'Ascending',
      sortDescending: 'Descending',
      new: 'New',
      inProgress: 'In progress',
      completed: 'Completed',
      allStatuses: 'All statuses',
      markInProgress: 'Move to in progress',
      markCompleted: 'Mark completed',
      viewOrder: 'View order',
      retryPayment: 'Retry payment',
    },
    common: {
      loading: 'Loading...',
      submit: 'Submit',
    },
  }),
}));

vi.mock('@/modules/orders/application/list-seller-orders-use-case', () => ({
  ListSellerOrdersUseCase: class {
    async execute(input: unknown) {
      return mocks.orderExecuteMock(input);
    }
  },
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerLookup: () => ({
      findByUserId: mocks.sellerFindByUserIdMock,
    }),
    getOrderRepository: () => ({}),
  },
}));

import SellerOrdersPage from '@/app/[locale]/seller/orders/page';

describe('SellerOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.sellerFindByUserIdMock.mockResolvedValue({
      sellerId: { value: 'seller-1' },
    });
    mocks.orderExecuteMock.mockResolvedValue({
      items: [
        {
          id: 'order-1',
          sellerId: 'seller-1',
          total: 25,
          status: 'new',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'order-2',
          sellerId: 'seller-1',
          total: 30,
          status: 'in_progress',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it('shows seller-only orders with lifecycle actions and default sorting', async () => {
    const element = await SellerOrdersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });

    render(element);

    expect(
      screen.getByRole('heading', { name: 'Seller orders' }),
    ).toBeInTheDocument();
    expect(mocks.orderExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        status: 'all',
        sortBy: 'createdAt',
        sortDir: 'desc',
      }),
    );
    expect(screen.getByText('order-1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move to in progress' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark completed' }),
    ).toBeInTheDocument();
  });
});
