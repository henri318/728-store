import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Pass-through requireRole — just calls the inner handler
function passThroughHandler(
  handler: (req: NextRequest, context?: unknown) => unknown,
) {
  return handler;
}
function passThroughRequireRole() {
  return passThroughHandler;
}

const mocks = vi.hoisted(() => {
  return {
    getProductRepositoryMock: vi.fn(),
    getProductListQueryUseCaseMock: vi.fn(),
    getOutboxRepositoryMock: vi.fn(),
    getSessionMock: vi.fn(),
    getSellerRepositoryMock: vi.fn(),
    getUserLookupMock: vi.fn(),
    requireRoleMock: vi.fn(passThroughRequireRole),
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
    getProductListQueryUseCase: mocks.getProductListQueryUseCaseMock,
    getOutboxRepository: mocks.getOutboxRepositoryMock,
    getSession: () => ({
      getSession: mocks.getSessionMock,
    }),
    getSellerRepository: mocks.getSellerRepositoryMock,
    getUserLookup: () => ({
      findById: mocks.getUserLookupMock,
    }),
  },
}));

// Import after mocks
import { GET, POST } from '@/app/api/products/route';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

function makeProduct(
  id: string,
  overrides: Partial<
    Omit<
      import('@/modules/products/domain/product-repository').ProductEntity,
      'id'
    >
  > = {},
): import('@/modules/products/domain/product-repository').ProductEntity {
  return {
    id,
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    translations: [
      { locale: 'es', name: 'Producto', description: 'Un producto' },
    ],
    images: [],
    tags: [],
    ...overrides,
  };
}

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/products', () => {
  let outbox: OutboxRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    outbox = new MemoryOutboxRepository();
    mocks.getOutboxRepositoryMock.mockReturnValue(outbox);
    mocks.getProductListQueryUseCaseMock.mockImplementation(
      () =>
        new ProductListQueryUseCase(
          mocks.getProductRepositoryMock(),
          mocks.getOutboxRepositoryMock(),
        ),
    );
    mocks.getSessionMock.mockResolvedValue(null);
  });

  it('returns 400 when page is 0', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?page=0'),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when pageSize is 0', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?pageSize=0'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when sortBy is invalid', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?sortBy=price'),
    );

    expect(res.status).toBe(400);
  });

  it('returns paginated products with defaults', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', { createdAt: new Date('2025-01-02') }),
      makeProduct('p2', { createdAt: new Date('2025-01-01') }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.totalPages).toBe(1);
  });

  it('applies q, category and tags filters', async () => {
    const repo = new MemoryProductRepository();
    repo.seedCategories([
      {
        id: 'cat-1',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
        translations: [
          { locale: 'es', name: 'Ropa' },
          { locale: 'cat', name: 'Roba' },
        ],
      },
    ]);
    repo.seed([
      makeProduct('p1', {
        categoryId: 'cat-1',
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'De algodón' },
        ],
        tags: [
          { id: 't1', name: 'Algodón', slug: 'cotton', createdAt: new Date() },
        ],
      }),
      makeProduct('p2', {
        categoryId: 'cat-1',
        translations: [
          { locale: 'es', name: 'Pantalón', description: 'De mezclilla' },
        ],
        tags: [
          { id: 't2', name: 'Mezclilla', slug: 'denim', createdAt: new Date() },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest(
        'http://localhost:3000/api/products?q=camiseta&category=clothing&tags=cotton',
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('p1');
  });

  it('defaults locale to es', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa' },
          { locale: 'cat', name: 'Samarreta', description: 'Roba' },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?q=camiseta'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].translations[0].locale).toBe('es');
  });

  it('falls back to es translation for unsupported locale', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa de verano' },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?lang=fr&q=camiseta'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('p1');
    expect(body.items[0].translations[0].locale).toBe('es');
  });

  it('does not expose seller-internal designChangeDescription for unauthenticated callers without audience', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        translations: [
          {
            locale: 'es',
            name: 'Camiseta',
            description: 'Ropa de verano',
            designChangeDescription: 'Solo para el equipo vendedor',
          },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue(null);

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].translations[0]).not.toHaveProperty(
      'designChangeDescription',
    );
  });

  it('returns empty result for ghost sellerId without error', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct('p1')]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?sellerId=ghost'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('parses tags from comma-separated string', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        tags: [{ id: 't1', name: 'A', slug: 'a', createdAt: new Date() }],
      }),
      makeProduct('p2', {
        tags: [{ id: 't2', name: 'B', slug: 'b', createdAt: new Date() }],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?tags=a,b'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
  });

  it('includes category object on response items', async () => {
    const repo = new MemoryProductRepository();
    repo.seedCategories([
      {
        id: 'cat-1',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
        translations: [
          { locale: 'es', name: 'Ropa' },
          { locale: 'cat', name: 'Roba' },
        ],
      },
    ]);
    repo.seed([
      makeProduct('p1', { categoryId: 'cat-1' }),
      makeProduct('p2', { categoryId: null }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    const withCategory = body.items.find((p: { id: string }) => p.id === 'p1');
    const withoutCategory = body.items.find(
      (p: { id: string }) => p.id === 'p2',
    );
    expect(withCategory.category).not.toBeNull();
    expect(withCategory.category.id).toBe('cat-1');
    expect(withCategory.category.slug).toBe('clothing');
    expect(withoutCategory.category).toBeNull();
  });

  it('returns cover-only listing cards without video metadata', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        images: [
          {
            id: 'cover-1',
            url: 'https://cdn.example.com/products/taza-cover.jpg',
            alt: 'Taza cover',
            position: 0,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'image/jpeg',
            posterUrl: null,
            productId: 'p1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          {
            id: 'showcase-1',
            url: 'https://cdn.example.com/products/taza-demo.mp4',
            alt: 'Taza demo',
            position: 0,
            purpose: ProductImagePurpose.SHOWCASE,
            mimeType: 'video/mp4',
            posterUrl: 'https://cdn.example.com/products/taza-poster.jpg',
            productId: 'p1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].cover).toMatchObject({
      url: 'https://cdn.example.com/products/taza-cover.jpg',
      alt: 'Taza cover',
    });
    expect(body.items[0]).not.toHaveProperty('images');
    expect(body.items[0]).not.toHaveProperty('hasVideoShowcase');
    expect(body.items[0]).not.toHaveProperty('showcase');
  });

  // ---------------------------------------------------------------------------
  // Audience-aware behavior
  // ---------------------------------------------------------------------------

  it('audience=public returns only ACTIVE products', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', { status: ProductStatus.ACTIVE }),
      makeProduct('draft-1', { status: ProductStatus.DRAFT }),
      makeProduct('archived-1', { status: ProductStatus.ARCHIVED }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=public'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(['active-1']);
  });

  it('audience=seller without auth is forced to public visibility', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', {
        status: ProductStatus.ACTIVE,
        translations: [
          {
            locale: 'es',
            name: 'Camiseta',
            description: 'Ropa de verano',
            designChangeDescription: 'Solo para vendedores',
          },
        ],
      }),
      makeProduct('draft-1', {
        status: ProductStatus.DRAFT,
        translations: [
          {
            locale: 'es',
            name: 'Borrador',
            description: 'Solo interno',
            designChangeDescription: 'Borrador privado',
          },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue(null);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=seller'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('active-1');
    expect(body.items[0].translations[0]).not.toHaveProperty(
      'designChangeDescription',
    );
  });

  it('audience=public defaults pageSize to 10', async () => {
    const repo = new MemoryProductRepository();
    const products = Array.from({ length: 25 }, (_, i) =>
      makeProduct(`p-${i}`, { createdAt: new Date(2025, 0, i + 1) }),
    );
    repo.seed(products);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=public'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pageSize).toBe(10);
    expect(body.items).toHaveLength(10);
  });

  it('audience=seller (authenticated default) keeps pageSize at 20 and shows all statuses', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', {
        status: ProductStatus.ACTIVE,
        sellerId: 'seller-1',
      }),
      makeProduct('draft-1', {
        status: ProductStatus.DRAFT,
        sellerId: 'seller-1',
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-1',
      role: 'DESIGNER',
    });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue({
        sellerId: { value: 'seller-1' },
        name: 'Test Shop',
      }),
    });

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pageSize).toBe(20);
    expect(body.items).toHaveLength(2);
  });

  it('audience=public + tag-name match returns the product', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        tags: [
          {
            id: 't1',
            name: 'Handmade',
            slug: 'handmade',
            createdAt: new Date(),
          },
        ],
      }),
      makeProduct('p2', {
        tags: [
          {
            id: 't2',
            name: 'Industrial',
            slug: 'industrial',
            createdAt: new Date(),
          },
        ],
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest(
        'http://localhost:3000/api/products?audience=public&q=handmade',
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(['p1']);
  });

  it('audience=public + non-empty q emits PRODUCT_SEARCH_EXECUTED for guest', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct('p1')]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue(null);

    const res = await GET(
      makeGetRequest(
        'http://localhost:3000/api/products?audience=public&q=ceramic&lang=es',
      ),
    );

    expect(res.status).toBe(200);
    expect(mocks.getProductListQueryUseCaseMock).toHaveBeenCalledOnce();
    const events = await outbox.findPending(10);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe(GlobalEvents.PRODUCT_SEARCH_EXECUTED);
    expect(events[0].payload).toMatchObject({
      userId: null,
      term: 'ceramic',
      locale: 'es',
    });
  });

  it('audience=public + non-empty q emits with session userId for authenticated user', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct('p1')]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-7' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-7',
      role: 'CUSTOMER',
    });

    const res = await GET(
      makeGetRequest(
        'http://localhost:3000/api/products?audience=public&q=ceramic',
      ),
    );

    expect(res.status).toBe(200);
    const events = await outbox.findPending(10);
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ userId: 'user-7' });
  });

  it('audience=public + empty q does NOT emit', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct('p1')]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=public'),
    );

    expect(res.status).toBe(200);
    const events = await outbox.findPending(10);
    expect(events).toHaveLength(0);
  });

  it('audience=seller + non-empty q does NOT emit', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([makeProduct('p1', { sellerId: 'seller-1' })]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-1',
      role: 'DESIGNER',
    });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue({
        sellerId: { value: 'seller-1' },
        name: 'Test Shop',
      }),
    });

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=seller&q=x'),
    );

    expect(res.status).toBe(200);
    const events = await outbox.findPending(10);
    expect(events).toHaveLength(0);
  });

  it('audience=public returns only ACTIVE products and defaults pageSize to 10', async () => {
    const repo = new MemoryProductRepository();
    const products = Array.from({ length: 25 }, (_, i) =>
      makeProduct(`p-${i}`, { createdAt: new Date(2025, 0, i + 1) }),
    );
    products.push(
      makeProduct('draft-1', { status: ProductStatus.DRAFT }),
      makeProduct('archived-1', { status: ProductStatus.ARCHIVED }),
    );
    repo.seed(products);
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=public'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pageSize).toBe(10);
    // 25 ACTIVE items; the 2 non-ACTIVE rows are filtered out.
    expect(body.total).toBe(25);
    expect(body.items).toHaveLength(10);
    const ids = body.items.map((p: { id: string }) => p.id);
    expect(ids).not.toContain('draft-1');
    expect(ids).not.toContain('archived-1');
  });

  it('returns 400 when pageSize is over 50 (DoS guard)', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?pageSize=51'),
    );

    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // SEC-01: Role-based audience derivation
  // ---------------------------------------------------------------------------

  it('CUSTOMER role forces audience=public regardless of query param', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', { status: ProductStatus.ACTIVE }),
      makeProduct('draft-1', { status: ProductStatus.DRAFT }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-c1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-c1',
      role: 'CUSTOMER',
    });

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=seller'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // CUSTOMER → forced to public → only ACTIVE products, pageSize 10
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('active-1');
    expect(body.pageSize).toBe(10);
  });

  it('DESIGNER role forces audience=seller and derives sellerId', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', { sellerId: 'seller-abc' }),
      makeProduct('p2', { sellerId: 'seller-xyz' }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-d1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-d1',
      role: 'DESIGNER',
    });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue({
        sellerId: { value: 'seller-abc' },
        name: 'My Shop',
      }),
    });

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    // DESIGNER → seller audience, sellerId derived from seller repo
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('p1');
    expect(body.items[0].sellerId).toBe('seller-abc');
  });

  it('DESIGNER role overrides any sellerId from query params', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', { sellerId: 'seller-abc' }),
      makeProduct('p2', { sellerId: 'seller-xyz' }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-d1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-d1',
      role: 'DESIGNER',
    });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue({
        sellerId: { value: 'seller-abc' },
        name: 'My Shop',
      }),
    });

    // Pass sellerId=seller-xyz — should be overridden by derived sellerId
    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?sellerId=seller-xyz'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('p1');
  });

  it('ADMIN role respects filter.audience and filter.sellerId as-is', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', {
        sellerId: 'seller-abc',
        status: ProductStatus.ACTIVE,
      }),
      makeProduct('p2', {
        sellerId: 'seller-xyz',
        status: ProductStatus.DRAFT,
      }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-a1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-a1',
      role: 'ADMIN',
    });

    // ADMIN with no params → defaults to admin audience, sees everything
    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    // admin audience → all statuses, no sellerId filter
    expect(body.items).toHaveLength(2);
  });

  it('ADMIN role can use audience=public to see only ACTIVE', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', { status: ProductStatus.ACTIVE }),
      makeProduct('draft-1', { status: ProductStatus.DRAFT }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-a1' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-a1',
      role: 'ADMIN',
    });

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/products?audience=public'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('active-1');
  });

  it('unknown role (user not found in DB) is treated as public', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('active-1', { status: ProductStatus.ACTIVE }),
      makeProduct('draft-1', { status: ProductStatus.DRAFT }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-ghost' });
    mocks.getUserLookupMock.mockResolvedValue(null);

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(200);
    const body = await res.json();
    // Unknown user → public → only ACTIVE, pageSize 10
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('active-1');
    expect(body.pageSize).toBe(10);
  });

  it('DESIGNER without linked seller gets 403', async () => {
    const repo = new MemoryProductRepository();
    repo.seed([
      makeProduct('p1', { status: ProductStatus.ACTIVE }),
      makeProduct('p2', { status: ProductStatus.DRAFT }),
    ]);
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getSessionMock.mockResolvedValue({ id: 'user-d2' });
    mocks.getUserLookupMock.mockResolvedValue({
      id: 'user-d2',
      role: 'DESIGNER',
    });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue(null),
    });

    const res = await GET(makeGetRequest('http://localhost:3000/api/products'));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('No seller account found for this user');
  });
});

describe('POST /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.getSellerRepositoryMock.mockReturnValue({
      findByUserId: vi.fn().mockResolvedValue({
        sellerId: SellerId.create('seller-1'),
        name: 'Test Shop',
      }),
    });
  });

  it('creates a product and returns 201', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getOutboxRepositoryMock.mockReturnValue(new MemoryOutboxRepository());

    const res = await fetchProductRoute({
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Con diseño',
          tags: ['hogar'],
          sizes: ['S', 'M'],
          designChangeDescription: 'Mi cambio de diseño',
        },
        {
          locale: 'cat',
          name: 'Tassa',
          description: 'Amb disseny',
          tags: ['llar'],
          sizes: ['M'],
          designChangeDescription: 'Canvi de disseny',
        },
      ],
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: null,
        textOffset: { x: 10, y: 20 },
        imageOffset: { x: 30, y: 40 },
      },
      translation: {
        tags: ['hogar'],
        sizes: ['S', 'M'],
        designChangeDescription: 'Mi cambio de diseño',
      },
      images: [],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.translations).toHaveLength(2);
    expect(body.translations[0].name).toBe('Taza');
    expect(body.sellerName).toBe('Test Shop');
  });

  it('forwards image metadata to the create use case', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getOutboxRepositoryMock.mockReturnValue(new MemoryOutboxRepository());

    const res = await fetchProductRoute({
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Con diseño',
          tags: [],
          sizes: [],
          designChangeDescription: 'Mi cambio de diseño',
        },
      ],
      customizationConfig: {
        mode: 'description',
        previewEnabled: false,
        previewTemplateUrl: null,
        textOffset: null,
        imageOffset: null,
      },
      translation: {
        tags: [],
        sizes: [],
        designChangeDescription: 'Mi cambio de diseño',
      },
      images: [
        {
          url: 'https://cdn.example.com/products/taza.mp4',
          alt: 'Taza en video',
          position: 0,
          purpose: ProductImagePurpose.SHOWCASE,
          mimeType: 'video/mp4',
          posterUrl: 'https://cdn.example.com/products/taza-poster.jpg',
        },
      ],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.images).toEqual([
      expect.objectContaining({
        purpose: ProductImagePurpose.SHOWCASE,
        mimeType: 'video/mp4',
        posterUrl: 'https://cdn.example.com/products/taza-poster.jpg',
      }),
    ]);
  });

  it('still creates a product when images are omitted', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getOutboxRepositoryMock.mockReturnValue(new MemoryOutboxRepository());

    const res = await fetchProductRoute({
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Con diseño',
          tags: [],
          sizes: [],
          designChangeDescription: 'Mi cambio de diseño',
        },
      ],
      customizationConfig: {
        mode: 'description',
        previewEnabled: false,
        previewTemplateUrl: null,
        textOffset: null,
        imageOffset: null,
      },
      translation: {
        tags: [],
        sizes: [],
        designChangeDescription: 'Mi cambio de diseño',
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.images).toEqual([]);
  });

  it('keeps designChangeDescription in translation payload only', async () => {
    const repo = new MemoryProductRepository();
    mocks.getProductRepositoryMock.mockReturnValue(repo);
    mocks.getOutboxRepositoryMock.mockReturnValue(new MemoryOutboxRepository());

    const res = await fetchProductRoute({
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Con diseño',
          tags: [],
          sizes: [],
          designChangeDescription: 'Mi cambio de diseño',
        },
      ],
      customizationConfig: {
        mode: 'description',
        previewEnabled: false,
        previewTemplateUrl: null,
        textOffset: null,
        imageOffset: null,
      },
      translation: {
        tags: [],
        sizes: [],
        designChangeDescription: 'Mi cambio de diseño',
      },
      images: [],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.translations[0].designChangeDescription).toBe(
      'Mi cambio de diseño',
    );
  });

  it('returns 400 for invalid payload', async () => {
    const res = await fetchProductRoute({ price: 0, translations: [] });

    expect(res.status).toBe(400);
  });
});

function fetchProductRoute(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

  return POST(request);
}
