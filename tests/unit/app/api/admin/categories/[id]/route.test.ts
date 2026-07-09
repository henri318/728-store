import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

function passthroughHandler(handler: unknown) {
  return handler;
}

const mocks = vi.hoisted(() => {
  const requireRoleMock = vi.fn(() => passthroughHandler);
  const getCategoryRepositoryMock = vi.fn();

  return {
    requireRoleMock,
    getCategoryRepositoryMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getCategoryRepository: mocks.getCategoryRepositoryMock,
  },
}));

import { DELETE } from '@/app/api/admin/categories/[id]/route';

describe('route authorization (module-load wiring)', () => {
  it('wires DELETE through requireRole("ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;

    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0][0]).toBe('ADMIN');
  });
});

describe('DELETE /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes unused categories', async () => {
    const repo = {
      findById: vi.fn(async () => ({
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        createdAt: new Date('2026-07-09T00:00:00.000Z'),
      })),
      countProducts: vi.fn(async () => 0),
      delete: vi.fn(async () => {}),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/admin/categories/cat-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'cat-1' }) },
    );

    expect(response.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith('cat-1');
  });

  it('blocks deletion when the category is in use', async () => {
    const repo = {
      findById: vi.fn(async () => ({
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        createdAt: new Date('2026-07-09T00:00:00.000Z'),
      })),
      countProducts: vi.fn(async () => 3),
      delete: vi.fn(async () => {}),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/admin/categories/cat-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'cat-1' }) },
    );

    expect(response.status).toBe(409);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    const repo = {
      findById: vi.fn(async () => null),
      countProducts: vi.fn(async () => 0),
      delete: vi.fn(async () => {}),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/admin/categories/missing', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'missing' }) },
    );

    expect(response.status).toBe(404);
    expect(repo.countProducts).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
