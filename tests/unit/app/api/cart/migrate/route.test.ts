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
  const uploadFindByIdMock = vi.fn();
  const generateReadUrlMock = vi.fn(
    async () => 'https://cdn.example.com/image.png',
  );

  return {
    getSessionMock,
    requireRoleMock,
    migrateExecuteMock,
    findByIdMock,
    findByIdsMock,
    uploadFindByIdMock,
    generateReadUrlMock,
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
    getCustomizationRepository: () => ({
      save: vi.fn(async (entity) => entity),
    }),
    getUploadRepository: () => ({
      findById: mocks.uploadFindByIdMock,
    }),
    getStoragePort: () => ({
      generateReadUrl: mocks.generateReadUrlMock,
      generateUploadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      delete: vi.fn(),
    }),
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

  it('resolves guest customization image upload ids before migration', async () => {
    mocks.uploadFindByIdMock.mockResolvedValue({
      id: 'upload-1',
      storageKey: 'customization/guest/upload-1.png',
    });
    mocks.migrateExecuteMock.mockResolvedValue({
      cart: {
        id: 'cart-1',
        userId: 'user-1',
        status: 'ACTIVE',
        items: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      migratedCount: 0,
      skippedProductIds: [],
      skippedCustomizationProductIds: [],
    });
    mocks.findByIdMock.mockResolvedValue({
      id: 'p-1',
      translations: [{ locale: 'es', name: 'Taza' }],
      images: [{ url: 'https://cdn.example.com/taza.png' }],
      sellerName: 'Test Shop',
      customizationConfig: null,
    });

    const res = await POST(
      makeRequest({
        guestItems: [
          {
            productId: 'p-1',
            sellerId: 's-1',
            quantity: 1,
            unitPriceSnapshot: 10,
            customizationImageUploadId: 'upload-1',
          },
        ],
        strategy: 'merge',
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.generateReadUrlMock).toHaveBeenCalledWith(
      'customization/guest/upload-1.png',
    );
    const migrateBody = mocks.migrateExecuteMock.mock.calls[0][0] as {
      guestItems: Array<{ customizationImageUrl?: string }>;
    };
    expect(migrateBody.guestItems[0].customizationImageUrl).toBe(
      'https://cdn.example.com/image.png',
    );
  });
});
