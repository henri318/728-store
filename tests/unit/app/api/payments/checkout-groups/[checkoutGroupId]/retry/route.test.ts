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
  const findByIdMock = vi.fn();
  const chargeMock = vi.fn();
  return { requireRoleMock, findByIdMock, chargeMock };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getCheckoutGroupLookup: () => ({
      findById: mocks.findByIdMock,
    }),
    getCheckoutGroupPaymentPort: () => ({
      charge: mocks.chargeMock,
    }),
  },
}));

import { POST } from '@/app/api/payments/checkout-groups/[checkoutGroupId]/retry/route';

function makeRequest(): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/payments/checkout-groups/group-1/retry',
    { method: 'POST' },
  );
}

describe('POST /api/payments/checkout-groups/[checkoutGroupId]/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries a failed checkout-group payment', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: { amount: 50 },
      paymentStatus: 'failed',
      paymentAttemptCount: 1,
      latestPaymentId: 'pay-1',
      linkedOrders: [],
    });
    mocks.chargeMock.mockResolvedValue({
      checkoutGroupId: 'group-1',
      paymentId: 'pay-2',
      status: 'completed',
    });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ checkoutGroupId: 'group-1' }),
    } as never);

    expect(res.status).toBe(200);
    expect(mocks.chargeMock).toHaveBeenCalledWith({
      checkoutGroupId: 'group-1',
      amount: 50,
      currency: 'EUR',
    });
  });

  it('returns 404 when the checkout group does not exist', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ checkoutGroupId: 'group-1' }),
    } as never);

    expect(res.status).toBe(404);
  });

  it('returns 409 when the checkout group payment is not retryable', async () => {
    mocks.findByIdMock.mockResolvedValue({
      id: 'group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: { amount: 50 },
      paymentStatus: 'completed',
      paymentAttemptCount: 1,
      latestPaymentId: 'pay-1',
      linkedOrders: [],
    });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ checkoutGroupId: 'group-1' }),
    } as never);

    expect(res.status).toBe(409);
  });
});
