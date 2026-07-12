import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';

function passthroughHandler(handler: unknown) {
  return handler;
}

const mocks = vi.hoisted(() => {
  const requireRoleMock = vi.fn(() => passthroughHandler);
  const getCategoryRepositoryMock = vi.fn();

  return { requireRoleMock, getCategoryRepositoryMock };
});

vi.mock('@/shared/authorization/authorization', () => ({
  requireRole: mocks.requireRoleMock,
}));
vi.mock('@/composition-root/container', () => ({
  container: { getCategoryRepository: mocks.getCategoryRepositoryMock },
}));

import { DELETE, PATCH } from '@/app/api/admin/categories/[id]/route';

const existing: CategoryEntity = {
  id: 'cat-1',
  slug: 'old-name',
  parentId: null,
  createdAt: new Date('2026-07-09T00:00:00.000Z'),
  translations: [
    { locale: 'es', name: 'Old name' },
    { locale: 'cat', name: 'Nom antic' },
  ],
};

describe('route authorization (module-load wiring)', () => {
  it('wires DELETE and PATCH through requireRole("ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.every(([role]) => role === 'ADMIN')).toBe(true);
  });
});

describe('DELETE /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes unused categories', async () => {
    const repo = {
      findById: vi.fn(async () => ({ ...existing })),
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
      findById: vi.fn(async () => ({ ...existing })),
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

describe('PATCH /api/admin/categories/[id]', () => {
  beforeEach(() => {
    mocks.getCategoryRepositoryMock.mockReset();
  });

  it('returns the updated category with a regenerated slug', async () => {
    const repo = {
      findById: vi.fn(async () => existing),
      findBySlug: vi.fn(async () => null),
      update: vi.fn(async (value: CategoryEntity) => value),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/categories/cat-1', {
        method: 'PATCH',
        body: JSON.stringify({ nameEs: 'Home', nameCat: 'Llar' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'cat-1' }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slug).toBe('home');
  });
});
