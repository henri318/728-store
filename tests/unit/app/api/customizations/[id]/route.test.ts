import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const findByUserIdMock = vi.fn();
  const findByIdMock = vi.fn();
  const saveMock = vi.fn();
  const isReferencedByOrdersMock = vi.fn();
  const productFindByIdMock = vi.fn();
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findByUserIdMock,
    findByIdMock,
    saveMock,
    isReferencedByOrdersMock,
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
      findById: mocks.findByIdMock,
      save: mocks.saveMock,
      delete: vi.fn(),
      isReferencedByOrders: mocks.isReferencedByOrdersMock,
    }),
    getProductRepository: () => ({
      findById: mocks.productFindByIdMock,
    }),
  },
}));

import { DELETE, GET, PATCH } from '@/app/api/customizations/[id]/route';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

const PARAMS = { params: Promise.resolve({ id: 'c-1' }) };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/customizations/c-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('GET /api/customizations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: SellerId.create('s-1'),
    });
  });

  it('returns 404 when customization does not exist', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/customizations/c-1'),
      PARAMS,
    );

    expect(res.status).toBe(404);
  });

  it('returns 403 when customization belongs to another seller', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });
    mocks.productFindByIdMock.mockResolvedValue({
      id: 'p-1',
      sellerId: 's-OTHER',
    });

    const res = await GET(
      new NextRequest('http://localhost:3000/api/customizations/c-1'),
      PARAMS,
    );

    expect(res.status).toBe(403);
  });

  it('returns the customization for the owner', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });
    mocks.productFindByIdMock.mockResolvedValue({ id: 'p-1', sellerId: 's-1' });

    const res = await GET(
      new NextRequest('http://localhost:3000/api/customizations/c-1'),
      PARAMS,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('c-1');
    expect(body.productId).toBe('p-1');
  });
});

describe('PATCH /api/customizations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: SellerId.create('s-1'),
    });
    mocks.findByIdMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });
    mocks.productFindByIdMock.mockResolvedValue({ id: 'p-1', sellerId: 's-1' });
  });

  it('returns 400 when body is empty', async () => {
    const res = await PATCH(makeRequest({}), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 400 when body is invalid', async () => {
    const res = await PATCH(makeRequest({ color: '' }), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 200 when the owner updates a customization', async () => {
    mocks.saveMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Updated',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });

    const res = await PATCH(makeRequest({ text: 'Updated' }), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('Updated');
  });
});

describe('DELETE /api/customizations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: SellerId.create('s-1'),
    });
    mocks.findByIdMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });
    mocks.productFindByIdMock.mockResolvedValue({ id: 'p-1', sellerId: 's-1' });
  });

  it('returns 409 when customization is in use', async () => {
    mocks.isReferencedByOrdersMock.mockResolvedValue(true);

    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/customizations/c-1'),
      PARAMS,
    );

    expect(res.status).toBe(409);
  });

  it('returns 200 when deleted by the owner', async () => {
    mocks.isReferencedByOrdersMock.mockResolvedValue(false);

    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/customizations/c-1'),
      PARAMS,
    );

    expect(res.status).toBe(200);
  });
});
