import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const assertRoleMock = vi.fn();
  return { assertRoleMock };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/shared/authorization/authorization', () => ({
  assertRole: mocks.assertRoleMock,
}));

import SellerLayout from '@/app/[locale]/seller/layout';

describe('SellerLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.assertRoleMock.mockResolvedValue({ id: 'user-1' });
  });

  it('protects nested seller routes with the DESIGNER role', async () => {
    const { redirect } = await import('next/navigation');
    mocks.assertRoleMock.mockRejectedValueOnce(new Error('FORBIDDEN'));

    await SellerLayout({
      children: <div>Protected content</div>,
      params: Promise.resolve({ locale: 'es' }),
    });

    expect(mocks.assertRoleMock).toHaveBeenCalledWith('DESIGNER');
    expect(redirect).toHaveBeenCalledWith('/es');
  });

  it('renders children for authorized users', async () => {
    const element = await SellerLayout({
      children: <div>Seller area</div>,
      params: Promise.resolve({ locale: 'cat' }),
    });

    render(element);

    expect(screen.getByText('Seller area')).toBeInTheDocument();
  });
});
