import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';

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

import { GET, POST } from '@/app/api/admin/categories/route';

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return {
    id: 'cat-1',
    slug: 'electronics',
    parentId: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    translations: [
      { locale: 'es', name: 'Electronics' },
      { locale: 'cat', name: 'Electrònica' },
    ],
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('route authorization (module-load wiring)', () => {
  it('wires GET and POST through requireRole("ADMIN")', () => {
    const calls = mocks.requireRoleMock.mock.calls as unknown as Array<
      [string, ...unknown[]]
    >;

    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0][0]).toBe('ADMIN');
    expect(calls[1][0]).toBe('ADMIN');
  });
});

describe('GET /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns categories sorted by display name', async () => {
    const repo = {
      findAll: vi.fn(async () => [
        makeCategory({
          id: 'cat-2',
          translations: [
            { locale: 'es', name: 'Books' },
            { locale: 'cat', name: 'Llibres' },
          ],
          slug: 'books',
        }),
        makeCategory(),
      ]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await GET(
      new NextRequest('http://localhost:3000/api/admin/categories'),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: CategoryEntity[] };
    expect(body.items).toHaveLength(2);
    expect(body.items[0].translations[0].name).toBe('Books');
    expect(body.items[1].translations[0].name).toBe('Electronics');
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a category with a normalized slug', async () => {
    const repo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(),
      countProducts: vi.fn(),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await POST(
      makeRequest({
        nameEs: '  Café con leche  ',
        nameCat: '  Cafè amb llet  ',
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as CategoryEntity;
    expect(body.translations).toEqual([
      { locale: 'es', name: 'Café con leche' },
      { locale: 'cat', name: 'Cafè amb llet' },
    ]);
    expect(body.slug).toBe('cafe-con-leche');
    expect(repo.findBySlug).toHaveBeenCalledWith('cafe-con-leche');
  });

  it('rejects duplicate categories with 409', async () => {
    const repo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(async () => makeCategory()),
      save: vi.fn(),
      delete: vi.fn(),
      countProducts: vi.fn(),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await POST(
      makeRequest({ nameEs: 'electronics', nameCat: 'electrònica' }),
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('already exists');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects empty names with 400', async () => {
    const repo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      countProducts: vi.fn(),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const response = await POST(
      makeRequest({ nameEs: ' '.repeat(3), nameCat: 'Roba' }),
    );

    expect(response.status).toBe(400);
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
