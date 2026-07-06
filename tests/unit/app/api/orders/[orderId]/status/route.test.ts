import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  const requireRoleMock = vi.fn(passThroughRequireRole);
  const getSessionMock = vi.fn();
  const findByUserIdMock = vi.fn();
  const findByIdMock = vi.fn();
  const updateStatusMock = vi.fn();
  return {
    requireRoleMock,
    getSessionMock,
    findByUserIdMock,
    findByIdMock,
    updateStatusMock,
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
    getOrderRepository: () => ({
      findById: mocks.findByIdMock,
      updateStatus: mocks.updateStatusMock,
    }),
  },
}));

import { POST } from '@/app/api/orders/[orderId]/status/route';

function makeRequest(status: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/orders/order-1/status', {
    method: 'POST',
    body: JSON.stringify({ status }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/orders/[orderId]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    mocks.findByUserIdMock.mockResolvedValue({
      sellerId: { value: 'seller-1' },
    });
  });

  it('advances new orders into in_progress', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 50,
      status: 'new',
    });

    const res = await POST(makeRequest('in_progress'), {
      params: Promise.resolve({ orderId: 'order-1' }),
    } as never);

    expect(res.status).toBe(200);
    expect(mocks.updateStatusMock).toHaveBeenCalledWith(
      'order-1',
      'in_progress',
    );
  });

  it('rejects designers who do not own the seller order', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-2',
      total: 50,
      status: 'new',
    });

    const res = await POST(makeRequest('in_progress'), {
      params: Promise.resolve({ orderId: 'order-1' }),
    } as never);

    expect(res.status).toBe(404);
    expect(mocks.updateStatusMock).not.toHaveBeenCalled();
  });

  it('rejects invalid status transitions', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 50,
      status: 'completed',
    });

    const res = await POST(makeRequest('in_progress'), {
      params: Promise.resolve({ orderId: 'order-1' }),
    } as never);

    expect(res.status).toBe(409);
  });
});
