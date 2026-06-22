import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks so they can be accessed by vi.mock factories
const mocks = vi.hoisted(() => {
  const findAllMock = vi.fn();
  const findAllByStatusMock = vi.fn();
  const findByNameMock = vi.fn();
  const findByEmailMock = vi.fn();
  const saveUserMock = vi.fn();
  const saveSellerMock = vi.fn();
  const saveOutboxEventMock = vi.fn();
  const hashPasswordMock = vi.fn(async (pw: string) => `mem:${pw}`);

  // Pass-through requireRole — just calls the inner handler.
  // The real requireRole would query the session + DB; in unit tests we
  // skip that and let each test drive the handler directly.
  const requireRoleMock = vi.fn(
    () => (handler: (req: NextRequest, context?: unknown) => unknown) =>
      handler,
  );

  return {
    findAllMock,
    findAllByStatusMock,
    findByNameMock,
    findByEmailMock,
    saveUserMock,
    saveSellerMock,
    saveOutboxEventMock,
    hashPasswordMock,
    requireRoleMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerRepository: () => ({
      findAll: mocks.findAllMock,
      findAllByStatus: mocks.findAllByStatusMock,
      findByName: mocks.findByNameMock,
      save: mocks.saveSellerMock,
    }),
    getUserRepository: () => ({
      findByEmail: mocks.findByEmailMock,
      save: mocks.saveUserMock,
    }),
    getOutboxRepository: () => ({
      saveEvent: mocks.saveOutboxEventMock,
    }),
    getPasswordHasher: () => ({
      hash: mocks.hashPasswordMock,
      verify: vi.fn(),
    }),
    getTransactionRunner: () => ({
      // Simple in-memory transaction runner: just calls the callback with
      // undefined (matches MemoryTransactionRunner semantics).
      run: vi.fn(
        async <T>(work: (tx: unknown) => Promise<T>): Promise<T> =>
          work(undefined),
      ),
    }),
  },
}));

// Import after mocks
import { GET, POST } from '@/app/api/sellers/route';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

function makeGetRequest(
  url = 'http://localhost:3000/api/sellers',
): NextRequest {
  return new NextRequest(url);
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/sellers', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('route authorization (module-load wiring)', () => {
  it('wires GET and POST through requireRole("ADMIN")', () => {
    // requireRole is called when the route module is imported, before any
    // test runs. So we inspect the cumulative call history here.
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    // At least two calls: one for GET, one for POST, both with 'ADMIN'
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      expect(call[0]).toBe('ADMIN');
    }
  });
});

describe('GET /api/sellers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with all sellers', async () => {
    mocks.findAllMock.mockResolvedValue([
      {
        sellerId: SellerId.create('s1'),
        name: 'Shop 1',
        description: null,
        userId: 'u1',
        status: SellerStatus.ACTIVE,
        deletedAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        sellerId: SellerId.create('s2'),
        name: 'Shop 2',
        description: 'desc',
        userId: 'u2',
        status: SellerStatus.SUSPENDED,
        deletedAt: null,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      },
    ]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe('s1');
    expect(body[0].name).toBe('Shop 1');
    expect(body[0].status).toBe('active');
    expect(body[1].id).toBe('s2');
    expect(body[1].status).toBe('suspended');
  });

  it('delegates to findAllByStatus when status is provided', async () => {
    mocks.findAllByStatusMock.mockResolvedValue([
      {
        sellerId: SellerId.create('s2'),
        name: 'Suspended Shop',
        description: null,
        userId: 'u2',
        status: SellerStatus.SUSPENDED,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const req = makeGetRequest(
      'http://localhost:3000/api/sellers?status=suspended',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Suspended Shop');
    expect(body[0].status).toBe('suspended');
  });

  it('returns empty array when no sellers exist', async () => {
    mocks.findAllMock.mockResolvedValue([]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe('POST /api/sellers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when body is invalid (missing required fields)', async () => {
    const res = await POST(makePostRequest({ name: 'Only Name' }));

    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    mocks.findByEmailMock.mockResolvedValue({
      userId: { value: 'u-existing' },
      email: { value: 'a@b.com' },
    });

    const res = await POST(
      makePostRequest({
        email: 'a@b.com',
        password: 'password1',
        firstName: 'A',
        lastName: 'B',
        name: 'New Shop',
      }),
    );

    expect(res.status).toBe(409);
  });

  it('returns 409 when seller name already exists', async () => {
    mocks.findByEmailMock.mockResolvedValue(null);
    mocks.findByNameMock.mockResolvedValue({ sellerId: { value: 's-old' } });

    const res = await POST(
      makePostRequest({
        email: 'a@b.com',
        password: 'password1',
        firstName: 'A',
        lastName: 'B',
        name: 'Duplicate',
      }),
    );

    expect(res.status).toBe(409);
  });

  it('returns 201 with the created seller on success', async () => {
    mocks.findByEmailMock.mockResolvedValue(null);
    mocks.findByNameMock.mockResolvedValue(null);
    mocks.saveUserMock.mockResolvedValue({ userId: { value: 'u-new' } });
    mocks.saveSellerMock.mockResolvedValue({
      sellerId: SellerId.create('s-new'),
      name: 'New Shop',
      description: 'A brand new shop',
      userId: 'u-new',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await POST(
      makePostRequest({
        email: 'new@shop.com',
        password: 'password1',
        firstName: 'New',
        lastName: 'Shop',
        name: 'New Shop',
        description: 'A brand new shop',
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('New Shop');
    expect(body.userId).toBe('u-new');
    expect(body.status).toBe('active');
    expect(body.id).toBeDefined();
  });

  it('hashes the password before creating the user', async () => {
    mocks.findByEmailMock.mockResolvedValue(null);
    mocks.findByNameMock.mockResolvedValue(null);
    mocks.saveUserMock.mockResolvedValue({ userId: { value: 'u-new' } });
    mocks.saveSellerMock.mockResolvedValue({
      sellerId: SellerId.create('s-new'),
      name: 'Hash Shop',
      description: null,
      userId: 'u-new',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    await POST(
      makePostRequest({
        email: 'hash@shop.com',
        password: 'plaintext',
        firstName: 'H',
        lastName: 'A',
        name: 'Hash Shop',
      }),
    );

    expect(mocks.hashPasswordMock).toHaveBeenCalledWith('plaintext');
  });
});
