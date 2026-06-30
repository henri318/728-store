import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const findByUserIdMock = vi.fn();
  const findBySellerIdMock = vi.fn();
  const findByIdMock = vi.fn();
  const saveMock = vi.fn();
  const productFindByIdMock = vi.fn();
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findByUserIdMock,
    findBySellerIdMock,
    findByIdMock,
    saveMock,
    productFindByIdMock,
    requireRoleMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSession: () => ({
      getSession: vi.fn(async () => ({ id: 'user-1' })),
    }),
    getSellerRepository: () => ({
      findByUserId: mocks.findByUserIdMock,
    }),
    getCustomizationRepository: () => ({
      findBySellerId: mocks.findBySellerIdMock,
      findById: mocks.findByIdMock,
      save: mocks.saveMock,
    }),
    getProductRepository: () => ({
      findById: mocks.productFindByIdMock,
    }),
  },
}));

import { GET, POST } from '@/app/api/customizations/route';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/customizations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('GET /api/customizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: SellerId.create('s-1'),
    });
  });

  it('returns seller-scoped customizations', async () => {
    mocks.findBySellerIdMock.mockResolvedValue([
      {
        id: 'c-1',
        productId: 'p-1',
        text: 'Hello',
        color: 'red',
        size: 'M',
        imageUrl: null,
        createdAt: new Date('2025-01-01'),
      },
    ]);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/customizations'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
    });
  });

  it('returns 403 when the session user has no seller profile', async () => {
    mocks.findByUserIdMock.mockResolvedValue(null);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/customizations'),
    );

    expect(res.status).toBe(403);
  });
});

describe('POST /api/customizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: SellerId.create('s-1'),
    });
  });

  it('returns 400 when body is invalid', async () => {
    const res = await POST(makeRequest({ productId: '' }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when body contains unknown fields', async () => {
    const res = await POST(
      makeRequest({ productId: 'p-1', text: 'Hello', unexpected: true }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 403 when product belongs to another seller', async () => {
    mocks.productFindByIdMock.mockResolvedValue({
      id: 'p-1',
      sellerId: 's-OTHER',
    });

    const res = await POST(makeRequest({ productId: 'p-1', text: 'Hello' }));

    expect(res.status).toBe(403);
  });

  it('creates a customization for the owned product', async () => {
    mocks.productFindByIdMock.mockResolvedValue({
      id: 'p-1',
      sellerId: 's-1',
    });
    mocks.saveMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });

    const res = await POST(
      makeRequest({ productId: 'p-1', text: 'Hello', color: 'red' }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('c-1');
    expect(body.productId).toBe('p-1');
  });
});
