import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

const mocks = vi.hoisted(() => {
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );
  const getSessionMock = vi.fn();
  const findByUserIdMock = vi.fn();
  const findByIdMock = vi.fn();
  const updateMock = vi.fn();
  const saveEventMock = vi.fn();

  return {
    requireRoleMock,
    getSessionMock,
    findByUserIdMock,
    findByIdMock,
    updateMock,
    saveEventMock,
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
    getSellerRepository: () => ({
      findByUserId: mocks.findByUserIdMock,
    }),
    getProductRepository: () => ({
      findById: mocks.findByIdMock,
      update: mocks.updateMock,
    }),
    getOutboxRepository: () => ({
      saveEvent: mocks.saveEventMock,
    }),
  },
}));

import { PATCH } from '@/app/api/products/[id]/route';

const PARAMS = { params: Promise.resolve({ id: 'p-1' }) };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/products/p-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeProduct(
  overrides: Partial<{ sellerId: string; status: ProductStatus }> = {},
) {
  return {
    id: 'p-1',
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: overrides.sellerId ?? 'seller-1',
    sellerName: 'Test Shop',
    status: overrides.status ?? ProductStatus.DRAFT,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    translations: [{ locale: 'es', name: 'Taza', description: 'Una taza' }],
    images: [],
    tags: [],
  };
}

describe('route authorization (module-load wiring)', () => {
  it('wires PATCH through requireRole("DESIGNER")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0][0]).toBe('DESIGNER');
  });
});

describe('PATCH /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: { value: 'seller-1' },
    });
  });

  it('returns 400 when body is invalid', async () => {
    const res = await PATCH(makeRequest({}), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 404 when the product is missing', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest({ locale: 'es', name: 'Taza', price: 10 }),
      PARAMS,
    );

    expect(res.status).toBe(404);
  });

  it('returns 403 when the authenticated seller does not own the product', async () => {
    mocks.findByIdMock.mockResolvedValue(makeProduct({ sellerId: 'seller-2' }));

    const res = await PATCH(
      makeRequest({ locale: 'es', name: 'Taza', price: 10 }),
      PARAMS,
    );

    expect(res.status).toBe(403);
  });

  it('returns 200 with the updated product for the owner', async () => {
    const updated = makeProduct({ status: ProductStatus.ACTIVE });
    mocks.findByIdMock.mockResolvedValue(makeProduct());
    mocks.updateMock.mockResolvedValue(updated);

    const res = await PATCH(
      makeRequest({
        locale: 'es',
        name: 'Taza nueva',
        price: 12,
        status: 'ACTIVE',
      }),
      PARAMS,
    );

    expect(res.status).toBe(200);
    expect(mocks.updateMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveEventMock).toHaveBeenCalledWith(
      'product.updated',
      expect.objectContaining({ productId: 'p-1', sellerId: 'seller-1' }),
    );
    const body = await res.json();
    expect(body.status).toBe('ACTIVE');
    expect(body.translations[0].name).toBe('Taza nueva');
  });
});
