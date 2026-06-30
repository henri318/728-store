import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

const mocks = vi.hoisted(() => {
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );
  const getSessionMock = vi.fn();
  const findByUserIdMock = vi.fn();
  const findByIdMock = vi.fn();
  const updateMock = vi.fn();
  const getUserLookupFindByIdMock = vi.fn();

  return {
    requireRoleMock,
    getSessionMock,
    findByUserIdMock,
    findByIdMock,
    updateMock,
    getUserLookupFindByIdMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSession: () => ({
      getSession: mocks.getSessionMock,
    }),
    getUserLookup: () => ({
      findById: mocks.getUserLookupFindByIdMock,
    }),
    getSellerRepository: () => ({
      findByUserId: mocks.findByUserIdMock,
    }),
    getProductRepository: () => ({
      findById: mocks.findByIdMock,
      update: mocks.updateMock,
    }),
  },
}));

import { PATCH } from '@/app/api/products/[id]/status/route';

const PARAMS = { params: Promise.resolve({ id: 'p-1' }) };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/products/p-1/status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeProduct(
  overrides: Partial<{
    status: ProductStatus;
    sellerId: string;
  }> = {},
) {
  return {
    id: 'p-1',
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: overrides.sellerId ?? 'seller-1',
    sellerName: 'Test Shop',
    status: overrides.status ?? ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [{ locale: 'es', name: 'Taza', description: 'Una taza' }],
    images: [],
    tags: [],
  };
}

function makeSeller() {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: null,
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

describe('route authorization (module-load wiring)', () => {
  it('wires PATCH through requireRole("DESIGNER", "ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const call of calls) {
      expect(call).toContain('DESIGNER');
      expect(call).toContain('ADMIN');
    }
  });
});

describe('PATCH /api/products/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.getUserLookupFindByIdMock.mockResolvedValue({
      id: 'user-1',
      role: 'DESIGNER',
    });
    mocks.findByUserIdMock.mockResolvedValue(makeSeller());
  });

  it('returns 400 when body is invalid', async () => {
    const res = await PATCH(makeRequest({}), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 404 when the product is missing', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: 'ARCHIVED' }), PARAMS);

    expect(res.status).toBe(404);
  });

  it('returns 403 when the authenticated seller does not own the product', async () => {
    mocks.findByIdMock.mockResolvedValue(makeProduct({ sellerId: 'seller-2' }));

    const res = await PATCH(makeRequest({ status: 'ARCHIVED' }), PARAMS);

    expect(res.status).toBe(403);
  });

  it('returns 200 with the updated status for the owner', async () => {
    const updated = makeProduct({ status: ProductStatus.ARCHIVED });
    mocks.findByIdMock.mockResolvedValue(makeProduct());
    mocks.updateMock.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ status: 'ARCHIVED' }), PARAMS);

    expect(res.status).toBe(200);
    expect(mocks.updateMock).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.status).toBe('ARCHIVED');
  });
});
