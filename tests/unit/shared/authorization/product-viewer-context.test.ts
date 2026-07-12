import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, getUserLookup, getSellerRepository } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserLookup: vi.fn(),
  getSellerRepository: vi.fn(),
}));

vi.mock('@/composition-root/container', () => ({
  container: { getSession, getUserLookup, getSellerRepository },
}));

import { resolveProductViewerContext } from '@/shared/authorization/product-viewer-context';

const product = { id: 'product-1', sellerId: 'seller-1' };

describe('resolveProductViewerContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSession.mockReturnValue({ getSession: vi.fn().mockResolvedValue(null) });
    getUserLookup.mockReturnValue({ findById: vi.fn() });
    getSellerRepository.mockReturnValue({ findByUserId: vi.fn() });
  });

  it('allows an authenticated designer who owns the product to edit', async () => {
    getSession.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ id: 'user-1' }),
    });
    getUserLookup.mockReturnValue({
      findById: vi.fn().mockResolvedValue({ id: 'user-1', role: 'DESIGNER' }),
    });
    getSellerRepository.mockReturnValue({
      findByUserId: vi
        .fn()
        .mockResolvedValue({ sellerId: { value: 'seller-1' } }),
    });

    await expect(resolveProductViewerContext(product, 'es')).resolves.toEqual({
      viewerUserId: 'user-1',
      viewerRole: 'DESIGNER',
      isOwner: true,
      canEdit: true,
      editHref: '/es/seller/products/product-1/edit',
    });
  });

  it.each([
    ['a non-owner designer', 'DESIGNER', 'seller-2'],
    ['a customer', 'CUSTOMER', 'seller-1'],
  ])('does not allow %s to edit', async (_description, role, sellerId) => {
    getSession.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ id: 'user-1' }),
    });
    getUserLookup.mockReturnValue({
      findById: vi.fn().mockResolvedValue({ id: 'user-1', role }),
    });
    getSellerRepository.mockReturnValue({
      findByUserId: vi
        .fn()
        .mockResolvedValue({ sellerId: { value: sellerId } }),
    });

    const context = await resolveProductViewerContext(product, 'cat');

    expect(context.viewerRole).toBe(role);
    expect(context.isOwner).toBe(
      role === 'DESIGNER' && sellerId === product.sellerId,
    );
    expect(context.canEdit).toBe(false);
    expect(context.editHref).toBeNull();
  });

  it('returns an anonymous context without throwing when there is no session', async () => {
    await expect(resolveProductViewerContext(product, 'es')).resolves.toEqual({
      viewerUserId: null,
      viewerRole: null,
      isOwner: false,
      canEdit: false,
      editHref: null,
    });
  });

  it('falls back to anonymous access when the server-side identity lookup fails', async () => {
    getSession.mockReturnValue({
      getSession: vi.fn().mockRejectedValue(new Error('session unavailable')),
    });

    await expect(resolveProductViewerContext(product, 'es')).resolves.toEqual({
      viewerUserId: null,
      viewerRole: null,
      isOwner: false,
      canEdit: false,
      editHref: null,
    });
  });
});
