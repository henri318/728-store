import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn(async () => ({ id: 'user-1' }));
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );
  const migrateExecuteMock = vi.fn();
  const findByIdMock = vi.fn();
  const findByIdsMock = vi.fn();

  return {
    getSessionMock,
    requireRoleMock,
    migrateExecuteMock,
    findByIdMock,
    findByIdsMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/modules/cart/application/migrate-guest-cart', () => ({
  MigrateGuestCart: vi.fn().mockImplementation(function MigrateGuestCart() {
    return {
      execute: mocks.migrateExecuteMock,
    };
  }),
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSession: () => ({
      getSession: mocks.getSessionMock,
    }),
    getCartRepository: () => ({}),
    getCartProductRepository: () => ({}),
    getOutboxRepository: () => ({}),
    getProductRepository: () => ({
      findById: mocks.findByIdMock,
    }),
    getCustomizationLookup: () => ({
      findByIds: mocks.findByIdsMock,
    }),
  },
}));

import { POST } from '@/app/api/cart/migrate/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/cart/migrate', {
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

describe('POST /api/cart/migrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
  });

  it('returns 400 when the payload is invalid', async () => {
    const res = await POST(makeRequest({ strategy: 'merge' }));

    expect(res.status).toBe(400);
  });

  it('returns resolved customizations instead of hardcoded nulls', async () => {
    mocks.migrateExecuteMock.mockResolvedValue({
      cart: {
        id: 'cart-1',
        userId: 'user-1',
        status: 'ACTIVE',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: { value: 'p-1' },
            sellerId: { value: 's-1' },
            quantity: 2,
            unitPriceSnapshot: { amount: 10, currency: 'EUR' },
            customizationIdList: ['c-1'],
          },
        ],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      migratedCount: 1,
      skippedProductIds: [],
      skippedCustomizationProductIds: [],
    });
    mocks.findByIdMock.mockResolvedValue({
      id: 'p-1',
      translations: [{ locale: 'es', name: 'Taza' }],
      images: [{ url: 'https://cdn.example.com/taza.png' }],
      sellerName: 'Test Shop',
    });
    mocks.findByIdsMock.mockResolvedValue([
      {
        id: 'c-1',
        productId: 'p-1',
        text: 'Hello',
        color: 'red',
        size: 'M',
        imageUrl: null,
      },
    ]);

    const res = await POST(makeRequest({ guestItems: [], strategy: 'merge' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cart.items[0].customizationIdList).toEqual(['c-1']);
    expect(body.cart.items[0].customizations).toEqual([
      {
        id: 'c-1',
        text: 'Hello',
        color: 'red',
        size: 'M',
        imageUrl: null,
      },
    ]);
    expect(body.skippedCustomizationProductIds).toEqual([]);
  });
});
