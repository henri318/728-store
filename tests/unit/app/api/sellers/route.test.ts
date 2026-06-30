import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks so they can be accessed by vi.mock factories
const mocks = vi.hoisted(() => {
  const findPaginatedMock = vi.fn();
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
    findPaginatedMock,
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
      findPaginated: mocks.findPaginatedMock,
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

function makeSellerEntity(
  id: string,
  overrides: Partial<{
    name: string;
    description: string | null;
    userId: string;
    status: SellerStatus;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    sellerId: SellerId.create(id),
    name: overrides.name ?? 'Shop',
    description: overrides.description ?? null,
    userId: overrides.userId ?? 'u1',
    status: overrides.status ?? SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01'),
  };
}

function makePaginatedResult(
  items: ReturnType<typeof makeSellerEntity>[],
  page = 1,
  pageSize = 20,
  total = items.length,
) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

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

describe('GET /api/sellers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when page is 0', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult([]));

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/sellers?page=0'),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when pageSize is 0', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult([]));

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/sellers?pageSize=0'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when sortBy is invalid', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult([]));

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/sellers?sortBy=email'),
    );

    expect(res.status).toBe(400);
  });

  it('returns paginated sellers with defaults', async () => {
    mocks.findPaginatedMock.mockResolvedValue(
      makePaginatedResult(
        [
          makeSellerEntity('s1', { name: 'Shop 1' }),
          makeSellerEntity('s2', {
            name: 'Shop 2',
            status: SellerStatus.SUSPENDED,
          }),
        ],
        1,
        20,
        2,
      ),
    );

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.totalPages).toBe(1);
    expect(body.items[0].id).toBe('s1');
    expect(body.items[0].name).toBe('Shop 1');
    expect(body.items[0].status).toBe('active');
    expect(body.items[1].id).toBe('s2');
    expect(body.items[1].status).toBe('suspended');
  });

  it('delegates query params to the use case', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult([]));

    const req = makeGetRequest(
      'http://localhost:3000/api/sellers?page=2&pageSize=15&q=camisa&sortBy=name&sortDir=asc&status=active',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mocks.findPaginatedMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 15,
      q: 'camisa',
      sortBy: 'name',
      sortDir: 'asc',
      status: SellerStatus.ACTIVE,
    });
  });

  it('filters by status', async () => {
    mocks.findPaginatedMock.mockResolvedValue(
      makePaginatedResult([
        makeSellerEntity('s2', {
          name: 'Suspended Shop',
          status: SellerStatus.SUSPENDED,
        }),
      ]),
    );

    const req = makeGetRequest(
      'http://localhost:3000/api/sellers?status=suspended',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Suspended Shop');
    expect(body.items[0].status).toBe('suspended');
  });

  it('filters by q', async () => {
    mocks.findPaginatedMock.mockResolvedValue(
      makePaginatedResult([makeSellerEntity('s1', { name: 'Camisa Shop' })]),
    );

    const req = makeGetRequest('http://localhost:3000/api/sellers?q=camisa');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Camisa Shop');
  });

  it('returns empty paginated result when no sellers exist', async () => {
    mocks.findPaginatedMock.mockResolvedValue(makePaginatedResult([]));

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
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
