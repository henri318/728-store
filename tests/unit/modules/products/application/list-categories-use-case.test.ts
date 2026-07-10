import { describe, expect, it, vi } from 'vitest';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    parentId: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ListCategoriesUseCase', () => {
  it('returns the sorted repository result for populated category lists', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => [
        makeCategory({ id: 'cat-2', name: 'Books', slug: 'books' }),
        makeCategory(),
      ]),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };

    const useCase = new ListCategoriesUseCase(repo);
    await expect(useCase.execute()).resolves.toEqual([
      makeCategory({ id: 'cat-2', name: 'Books', slug: 'books' }),
      makeCategory(),
    ]);
    expect(repo.findAllSorted).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when no categories exist', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new ListCategoriesUseCase(repo);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(repo.findAllSorted).toHaveBeenCalledTimes(1);
  });
});
