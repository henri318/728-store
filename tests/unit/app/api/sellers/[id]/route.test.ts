import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist all mocks so they can be accessed by vi.mock factories
const mocks = vi.hoisted(() => {
  const getServerSessionMock = vi.fn();
  const findByIdMock = vi.fn();
  const updateSellerMock = vi.fn();
  const softDeleteMock = vi.fn();
  const saveOutboxEventMock = vi.fn();
  const findByNameMock = vi.fn();

  return {
    getServerSessionMock,
    findByIdMock,
    updateSellerMock,
    softDeleteMock,
    saveOutboxEventMock,
    findByNameMock,
  };
});

vi.mock('next-auth', () => ({
  getServerSession: mocks.getServerSessionMock,
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: { providers: [] },
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerRepository: () => ({
      findById: mocks.findByIdMock,
      update: mocks.updateSellerMock,
      softDelete: mocks.softDeleteMock,
      findByName: mocks.findByNameMock,
    }),
    getOutboxRepository: () => ({
      saveEvent: mocks.saveOutboxEventMock,
    }),
  },
}));

// Import after mocks
import { GET, PATCH, DELETE } from '@/app/api/sellers/[id]/route';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

const PARAMS = { params: Promise.resolve({ id: 's-1' }) };

function makeRequest(
  method: 'GET' | 'PATCH' | 'DELETE',
  body?: unknown,
): NextRequest {
  const init: {
    method: string;
    body?: string;
    headers?: Record<string, string>;
  } = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'content-type': 'application/json' };
  }
  return new NextRequest('http://localhost:3000/api/sellers/s-1', init);
}

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const OTHER_USER_SESSION = { user: { id: 'user-2', role: 'CUSTOMER' } };
const SELF_USER_SESSION = { user: { id: 'user-1', role: 'DESIGNER' } };

function makeSeller(
  overrides: Partial<{
    id: string;
    name: string;
    userId: string;
    status: SellerStatus;
    deletedAt: Date | null;
  }> = {},
) {
  return {
    sellerId: SellerId.create(overrides.id ?? 's-1'),
    name: overrides.name ?? 'Test Shop',
    description: null,
    userId: overrides.userId ?? 'user-1',
    status: overrides.status ?? SellerStatus.ACTIVE,
    deletedAt: overrides.deletedAt ?? null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

describe('GET /api/sellers/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 404 when seller not found', async () => {
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await GET(makeRequest('GET'), PARAMS);

    expect(res.status).toBe(404);
  });

  it('returns 200 with the seller (public, active)', async () => {
    const seller = makeSeller();
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await GET(makeRequest('GET'), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('s-1');
    expect(body.name).toBe('Test Shop');
    expect(body.status).toBe('active');
  });

  it('returns 404 when non-admin tries to see a banned seller', async () => {
    const seller = makeSeller({ status: SellerStatus.BANNED });
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await GET(makeRequest('GET'), PARAMS);

    expect(res.status).toBe(404);
  });

  it('allows admin to see a banned seller', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    const seller = makeSeller({ status: SellerStatus.BANNED });
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await GET(makeRequest('GET'), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('banned');
  });

  it('returns 404 when seller is soft-deleted (non-admin)', async () => {
    const seller = makeSeller({ deletedAt: new Date() });
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await GET(makeRequest('GET'), PARAMS);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/sellers/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when no session', async () => {
    mocks.getServerSessionMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin and not the seller self', async () => {
    mocks.getServerSessionMock.mockResolvedValue(OTHER_USER_SESSION);
    const seller = makeSeller({ userId: 'user-1' });
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS);

    expect(res.status).toBe(403);
  });

  it('returns 404 when seller not found', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS);

    expect(res.status).toBe(404);
  });

  it('returns 400 when body is invalid', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    mocks.findByIdMock.mockResolvedValue(makeSeller());

    const res = await PATCH(makeRequest('PATCH', { name: '' }), PARAMS);

    expect(res.status).toBe(400);
  });

  it('returns 200 when admin updates the seller', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    const seller = makeSeller();
    mocks.findByIdMock.mockResolvedValue(seller);
    mocks.findByNameMock.mockResolvedValue(null);
    const updated = { ...seller, name: 'Updated Name' };
    mocks.updateSellerMock.mockResolvedValue(updated);
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await PATCH(
      makeRequest('PATCH', { name: 'Updated Name' }),
      PARAMS,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Name');
  });

  it('returns 200 when seller self updates their own profile', async () => {
    mocks.getServerSessionMock.mockResolvedValue(SELF_USER_SESSION);
    const seller = makeSeller({ userId: 'user-1' });
    mocks.findByIdMock.mockResolvedValue(seller);
    mocks.findByNameMock.mockResolvedValue(null);
    const updated = { ...seller, description: 'Self updated' };
    mocks.updateSellerMock.mockResolvedValue(updated);
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await PATCH(
      makeRequest('PATCH', { description: 'Self updated' }),
      PARAMS,
    );

    expect(res.status).toBe(200);
  });

  it('returns 409 when updated name conflicts with another seller', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    const seller = makeSeller({ name: 'Old Name' });
    mocks.findByIdMock.mockResolvedValue(seller);
    mocks.findByNameMock.mockResolvedValue({ id: 's-2' });

    const res = await PATCH(
      makeRequest('PATCH', { name: 'Conflict Name' }),
      PARAMS,
    );

    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/sellers/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when no session', async () => {
    mocks.getServerSessionMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest('DELETE'), PARAMS);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin and not the seller self', async () => {
    mocks.getServerSessionMock.mockResolvedValue(OTHER_USER_SESSION);
    const seller = makeSeller({ userId: 'user-1' });
    mocks.findByIdMock.mockResolvedValue(seller);

    const res = await DELETE(makeRequest('DELETE'), PARAMS);

    expect(res.status).toBe(403);
  });

  it('returns 404 when seller not found', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    mocks.findByIdMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest('DELETE'), PARAMS);

    expect(res.status).toBe(404);
  });

  it('returns 200 with success when admin soft-deletes', async () => {
    mocks.getServerSessionMock.mockResolvedValue(ADMIN_SESSION);
    const seller = makeSeller();
    mocks.findByIdMock.mockResolvedValue(seller);
    const deletedSeller = { ...seller, deletedAt: new Date() };
    mocks.updateSellerMock.mockResolvedValue(deletedSeller);
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest('DELETE'), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it('returns 200 with success when seller self deletes', async () => {
    mocks.getServerSessionMock.mockResolvedValue(SELF_USER_SESSION);
    const seller = makeSeller({ userId: 'user-1' });
    mocks.findByIdMock.mockResolvedValue(seller);
    const deletedSeller = { ...seller, deletedAt: new Date() };
    mocks.updateSellerMock.mockResolvedValue(deletedSeller);
    mocks.saveOutboxEventMock.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest('DELETE'), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });
});
