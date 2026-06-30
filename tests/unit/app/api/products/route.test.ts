import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

const mocks = vi.hoisted(() => {
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );
  const getSessionMock = vi.fn();
  const findByUserIdMock = vi.fn();
  const saveMock = vi.fn();
  const saveEventMock = vi.fn();

  return {
    requireRoleMock,
    getSessionMock,
    findByUserIdMock,
    saveMock,
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
      save: mocks.saveMock,
    }),
    getOutboxRepository: () => ({
      saveEvent: mocks.saveEventMock,
    }),
  },
}));

import { POST } from '@/app/api/products/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('route authorization (module-load wiring)', () => {
  it('wires POST through requireRole("DESIGNER")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0][0]).toBe('DESIGNER');
  });
});

describe('POST /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: { value: 'seller-1' },
      name: 'Test Shop',
    });
  });

  it('returns 400 when the body is invalid', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });

  it('returns 403 when the session user has no seller profile', async () => {
    mocks.findByUserIdMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        locale: 'es',
        name: 'Camiseta',
        price: 19.99,
      }),
    );

    expect(res.status).toBe(403);
  });

  it('creates a seller-scoped draft product and returns the stored translation', async () => {
    mocks.saveMock.mockImplementation(async (product) => product);

    const res = await POST(
      makeRequest({
        locale: 'es',
        name: 'Camiseta personalizable',
        description: 'Camiseta para diseñar',
        price: 19.99,
        status: ProductStatus.DRAFT,
        customizationConfig: {
          mode: 'text_photo',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/shirt.png',
          textOffset: { x: 12, y: 18 },
          imageOffset: { x: 22, y: 30 },
        },
      }),
    );

    expect(res.status).toBe(201);
    expect(mocks.saveMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveEventMock).toHaveBeenCalledWith(
      'product.created',
      expect.objectContaining({
        sellerId: 'seller-1',
        status: ProductStatus.DRAFT,
      }),
    );
    const body = await res.json();

    expect(body.sellerId).toBe('seller-1');
    expect(body.status).toBe(ProductStatus.DRAFT);
    expect(body.basePrice).toEqual({ amount: 19.99, currency: Currency.EUR });
    expect(body.translations[0]).toMatchObject({
      locale: 'es',
      name: 'Camiseta personalizable',
      description: 'Camiseta para diseñar',
    });
    expect(body.customizationConfig.mode).toBe('text_photo');
  });
});
