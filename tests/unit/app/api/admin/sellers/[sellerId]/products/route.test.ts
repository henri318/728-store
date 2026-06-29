import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const findBySellerIdMock = vi.fn();

  // Pass-through requireRole — just calls the inner handler
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findBySellerIdMock,
    requireRoleMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: () => ({
      findBySellerId: mocks.findBySellerIdMock,
    }),
  },
}));

// Import after mocks
import { GET } from '@/app/api/admin/sellers/[sellerId]/products/route';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

const PARAMS = { params: Promise.resolve({ sellerId: 's-1' }) };

function makeRequest(
  url = 'http://localhost:3000/api/admin/sellers/s-1/products',
): NextRequest {
  return new NextRequest(url);
}

describe('route authorization (module-load wiring)', () => {
  it('wires GET through requireRole("ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const call of calls) {
      expect(call[0]).toBe('ADMIN');
    }
  });
});

describe('GET /api/admin/sellers/[sellerId]/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with products for the seller', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([
      {
        id: 'p1',
        basePrice: ProductPrice.create(10, Currency.EUR),
        sellerId: 's-1',
        sellerName: 'Test Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        updatedAt: new Date('2025-01-01'),
        translations: [{ locale: 'es', name: 'Taza', description: 'Una taza' }],
        images: [],
        tags: [],
      },
    ]);

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].id).toBe('p1');
    expect(body.products[0].name).toBe('Taza');
    expect(body.products[0].status).toBe('ACTIVE');
    expect(body.products[0].basePrice).toEqual({
      amount: 10,
      currency: 'EUR',
    });
  });

  it('returns empty array when seller has no products', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([]);

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toEqual([]);
  });

  it('passes locale from query param to use case', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([]);

    const res = await GET(
      makeRequest(
        'http://localhost:3000/api/admin/sellers/s-1/products?locale=cat',
      ),
      PARAMS,
    );

    expect(res.status).toBe(200);
    expect(mocks.findBySellerIdMock).toHaveBeenCalledWith('s-1', 'cat');
  });

  it('defaults to "es" locale when no query param', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([]);

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    expect(mocks.findBySellerIdMock).toHaveBeenCalledWith('s-1', 'es');
  });

  it('uses "Untranslated" when product has no matching translation', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([
      {
        id: 'p2',
        basePrice: ProductPrice.create(20, Currency.EUR),
        sellerId: 's-1',
        sellerName: 'Test Shop',
        status: ProductStatus.DRAFT,
        categoryId: null,
        category: null,
        updatedAt: new Date('2025-01-02'),
        translations: [],
        images: [],
        tags: [],
      },
    ]);

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products[0].name).toBe('Untranslated');
  });
});
