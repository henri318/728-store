import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  return {
    getProductRepositoryMock: vi.fn(),
  };
});

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
  },
}));

// Import after mocks
import { GET } from '@/app/api/products/route';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';

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
    basePrice: 10,
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
    customizations: [],
    images: [],
    tags: [],
    ...overrides,
  };
}

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(body.pageSize).toBe(20);
    expect(body.totalPages).toBe(1);
  });

  it('applies q, category and tags filters', async () => {
    const repo = new MemoryProductRepository();
    repo.seedCategories([
      {
        id: 'cat-1',
        name: 'Ropa',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
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
        name: 'Ropa',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
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
});
