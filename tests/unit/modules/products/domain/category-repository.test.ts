import { describe, expect, it, vi } from 'vitest';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';

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

describe('CategoryRepository port', () => {
  it('supports listing, lookup, persistence, deletion, and usage counting', async () => {
    const categories = [makeCategory()];
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => [...categories]),
      findById: vi.fn(
        async (id: string) =>
          categories.find((category) => category.id === id) ?? null,
      ),
      findBySlug: vi.fn(
        async (slug: string) =>
          categories.find((category) => category.slug === slug) ?? null,
      ),
      save: vi.fn(async (category: CategoryEntity) => {
        categories.push(category);
        return category;
      }),
      delete: vi.fn(async (id: string) => {
        const index = categories.findIndex((category) => category.id === id);
        if (index !== -1) {
          categories.splice(index, 1);
        }
      }),
      countProducts: vi.fn(async () => 0),
    };

    await expect(repo.findAllSorted()).resolves.toEqual([makeCategory()]);
    await expect(repo.findBySlug('electronics')).resolves.toEqual(
      makeCategory(),
    );

    const created = makeCategory({ id: 'cat-2', name: 'Home', slug: 'home' });
    await expect(repo.save(created)).resolves.toEqual(created);
    expect(await repo.findById('cat-2')).toEqual(created);

    await repo.delete('cat-2');
    expect(await repo.findById('cat-2')).toBeNull();
    await expect(repo.countProducts('cat-1')).resolves.toBe(0);

    expect(repo.findAllSorted).toHaveBeenCalledTimes(1);
    expect(repo.findBySlug).toHaveBeenCalledWith('electronics');
    expect(repo.save).toHaveBeenCalledWith(created);
    expect(repo.delete).toHaveBeenCalledWith('cat-2');
    expect(repo.countProducts).toHaveBeenCalledWith('cat-1');
  });
});
