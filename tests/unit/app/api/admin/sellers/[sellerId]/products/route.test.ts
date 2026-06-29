import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const findPaginatedMock = vi.fn();

  // Pass-through requireRole — just calls the inner handler
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findPaginatedMock,
    requireRoleMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: () => ({
      findPaginated: mocks.findPaginatedMock,
    }),
  },
}));

// Import after mocks
import { GET } from '@/app/api/admin/sellers/[sellerId]/products/route';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';

const PARAMS = { params: Promise.resolve({ sellerId: 's-1' }) };

function makeRequest(
  url = 'http://localhost:3000/api/admin/sellers/s-1/products',
): NextRequest {
  return new NextRequest(url);
}

function makePaginatedResult() {
  return {
    items: [
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
    ],
    total: 1,
    page: 2,
    pageSize: 5,
    totalPages: 3,
  };
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

  it('returns 200 with a paginated envelope for the seller', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult());
    const parseSpy = vi.spyOn(productListQuerySchema, 'parse');

    const res = await GET(
      makeRequest(
        'http://localhost:3000/api/admin/sellers/s-1/products?q=taza&page=2&pageSize=5&locale=cat&sortBy=createdAt&sortDir=asc',
      ),
      PARAMS,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(5);
    expect(body.totalPages).toBe(3);
    expect(body.items[0].id).toBe('p1');
    expect(body.items[0].name).toBe('Taza');
    expect(body.items[0].status).toBe('ACTIVE');
    expect(body.items[0].basePrice).toEqual({
      amount: 10,
      currency: 'EUR',
    });
    expect(mocks.findPaginatedMock).toHaveBeenCalledWith({
      sellerId: 's-1',
      q: 'taza',
      page: 2,
      pageSize: 5,
      lang: 'cat',
      sortBy: 'createdAt',
      sortDir: 'asc',
    });
    expect(parseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 's-1',
        q: 'taza',
        page: '2',
        pageSize: '5',
        lang: 'cat',
        sortBy: 'createdAt',
        sortDir: 'asc',
      }),
    );
  });

  it('returns empty array when seller has no products', async () => {
    mocks.findPaginatedMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('defaults locale to es when no query param is provided', async () => {
    mocks.findPaginatedMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    expect(mocks.findPaginatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'es' }),
    );
  });

  it('uses "Untranslated" when product has no matching translation', async () => {
    mocks.findPaginatedMock.mockResolvedValue({
      items: [
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
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const res = await GET(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].name).toBe('Untranslated');
  });
});
