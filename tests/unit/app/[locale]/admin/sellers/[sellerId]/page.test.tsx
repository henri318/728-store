import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchMock = vi.fn();

const mocks = vi.hoisted(() => {
  const assertRoleMock = vi.fn(async () => undefined);
  const getDictionaryMock = vi.fn();
  const getSellerRepositoryMock = vi.fn();
  const redirectMock = vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  });
  const notFoundMock = vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  });

  return {
    assertRoleMock,
    getDictionaryMock,
    getSellerRepositoryMock,
    redirectMock,
    notFoundMock,
  };
});

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
  notFound: mocks.notFoundMock,
}));

vi.mock('@/shared/authorization/authorization', () => ({
  assertRole: mocks.assertRoleMock,
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerRepository: mocks.getSellerRepositoryMock,
  },
}));

import AdminSellerDetailPage from '@/app/[locale]/admin/sellers/[sellerId]/page';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

function makeSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: 'A test shop',
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
    admin: {
      backToSellers: 'Back to sellers',
      sellerDetail: {
        editTitle: 'Edit seller',
        nameLabel: 'Business name',
        descriptionLabel: 'Description',
        save: 'Save',
        saved: 'Saved',
      },
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('AdminSellerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue(makeDict());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders commercial seller fields only and submits a PATCH request', async () => {
    const repo = new MemorySellerRepository();
    repo.seed(makeSeller());
    mocks.getSellerRepositoryMock.mockReturnValue(repo);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    } as Response);

    const element = await AdminSellerDetailPage({
      params: Promise.resolve({ locale: 'es', sellerId: 'seller-1' }),
    });
    render(element);

    expect(
      screen.getByRole('link', { name: 'Back to sellers' }),
    ).toHaveAttribute('href', '/es/admin/sellers');
    expect(
      screen.getByRole('heading', { name: 'Edit seller' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Business name')).toHaveValue('Test Shop');
    expect(screen.getByLabelText('Description')).toHaveValue('A test shop');
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/last name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Business name'), {
      target: { value: 'Updated Shop' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Updated description' },
    });
    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sellers/seller-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Shop',
          description: 'Updated description',
        }),
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('redirects non-admin users to the locale root', async () => {
    mocks.assertRoleMock.mockRejectedValueOnce(new Error('FORBIDDEN'));

    await expect(
      AdminSellerDetailPage({
        params: Promise.resolve({ locale: 'es', sellerId: 'seller-1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.redirectMock).toHaveBeenCalledWith('/es');
  });

  it('returns 404 for a missing seller', async () => {
    const repo = new MemorySellerRepository();
    mocks.getSellerRepositoryMock.mockReturnValue(repo);

    await expect(
      AdminSellerDetailPage({
        params: Promise.resolve({ locale: 'es', sellerId: 'missing' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mocks.notFoundMock).toHaveBeenCalled();
  });
});
