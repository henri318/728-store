import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const findByIdMock = vi.fn();
  const updateSellerMock = vi.fn();
  const saveOutboxEventMock = vi.fn();
  const transactionRunnerMock = {
    // Pass-through runner — invokes the work callback with `undefined`
    // as the tx client, matching MemoryTransactionRunner's behavior.
    run: vi.fn(
      async <T>(work: (tx: unknown) => Promise<T>): Promise<T> =>
        work(undefined),
    ),
  };

  // Pass-through requireRole — just calls the inner handler
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findByIdMock,
    updateSellerMock,
    saveOutboxEventMock,
    transactionRunnerMock,
    requireRoleMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerRepository: () => ({
      findById: mocks.findByIdMock,
      update: mocks.updateSellerMock,
    }),
    getOutboxRepository: () => ({
      saveEvent: mocks.saveOutboxEventMock,
    }),
    getTransactionRunner: () => mocks.transactionRunnerMock,
  },
}));

// Import after mocks
import { PATCH } from '@/app/api/sellers/[id]/status/route';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

describe('route authorization (module-load wiring)', () => {
  it('wires PATCH through requireRole("ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const call of calls) {
      expect(call[0]).toBe('ADMIN');
    }
  });
});

const PARAMS = { params: Promise.resolve({ id: 's-1' }) };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/sellers/s-1/status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeSeller(
  overrides: Partial<{
    status: SellerStatus;
  }> = {},
) {
  return {
    sellerId: SellerId.create('s-1'),
    name: 'Test Shop',
    description: null,
    userId: 'user-1',
    status: overrides.status ?? SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

describe('PATCH /api/sellers/[id]/status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when body is invalid (no status)', async () => {
    const res = await PATCH(makeRequest({}), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 400 when status value is invalid', async () => {
    const res = await PATCH(makeRequest({ status: 'invalid' }), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 404 when seller not found', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: 'suspended' }), PARAMS);

    expect(res.status).toBe(404);
  });

  it('returns 200 with updated seller on valid active→suspended', async () => {
    mocks.findByIdMock.mockResolvedValue(makeSeller());
    mocks.updateSellerMock.mockResolvedValue(
      makeSeller({ status: SellerStatus.SUSPENDED }),
    );
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await PATCH(makeRequest({ status: 'suspended' }), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('suspended');
    expect(body.id).toBe('s-1');
  });

  it('wraps status update and outbox event in a transaction', async () => {
    // This test pins the Transactional Outbox Pattern contract at the
    // route boundary: the route MUST pass a transactionRunner from the
    // container so the status change and the outbox event commit atomically.
    mocks.findByIdMock.mockResolvedValue(makeSeller());
    mocks.updateSellerMock.mockResolvedValue(
      makeSeller({ status: SellerStatus.SUSPENDED }),
    );
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    await PATCH(makeRequest({ status: 'suspended' }), PARAMS);

    expect(mocks.transactionRunnerMock.run).toHaveBeenCalledTimes(1);
    // The transaction callback MUST invoke update + saveEvent so they share
    // the same DB transaction in the real Prisma adapter.
    expect(mocks.updateSellerMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveOutboxEventMock).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid transition (banned→active)', async () => {
    mocks.findByIdMock.mockResolvedValue(
      makeSeller({ status: SellerStatus.BANNED }),
    );

    const res = await PATCH(makeRequest({ status: 'active' }), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 400 for same-status no-op (active→active)', async () => {
    mocks.findByIdMock.mockResolvedValue(makeSeller());

    const res = await PATCH(makeRequest({ status: 'active' }), PARAMS);

    expect(res.status).toBe(400);
  });
});
