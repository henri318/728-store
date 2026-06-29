import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const findByIdMock = vi.fn();
  const saveMock = vi.fn();
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findByIdMock,
    saveMock,
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
    getProductRepository: () => ({
      findById: mocks.findByIdMock,
    }),
    getCustomizationRepository: () => ({
      save: mocks.saveMock,
    }),
  },
}));

import { POST } from '@/app/api/customizations/customer/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/customizations/customer', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('route authorization (module-load wiring)', () => {
  it('wires POST through requireRole("CUSTOMER")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0][0]).toBe('CUSTOMER');
  });
});

describe('POST /api/customizations/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByIdMock.mockResolvedValue({
      id: 'p-1',
      sellerId: 's-1',
      customizationConfig: null,
    });
  });

  it('returns 400 when the body is invalid', async () => {
    const res = await POST(makeRequest({ productId: '' }));
    expect(res.status).toBe(400);
  });

  it('creates a customization for the authenticated customer', async () => {
    mocks.saveMock.mockResolvedValue({
      id: 'c-1',
      productId: 'p-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date('2025-01-01'),
    });

    const res = await POST(makeRequest({ productId: 'p-1', text: 'Hello' }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('c-1');
    expect(body.productId).toBe('p-1');
  });

  it('returns 404 when the product does not exist', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ productId: 'missing', text: 'Hello' }),
    );

    expect(res.status).toBe(404);
  });
});
