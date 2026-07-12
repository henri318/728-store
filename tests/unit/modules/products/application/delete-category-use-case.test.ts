import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';
import { DeleteCategoryUseCase } from '@/modules/products/application/delete-category-use-case';

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

describe('DeleteCategoryUseCase', () => {
  it('deletes unused categories', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => makeCategory()),
      countProducts: vi.fn(async () => 0),
      delete: vi.fn(async () => {}),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      update: vi.fn(async (category: CategoryEntity) => category),
    };
    const useCase = new DeleteCategoryUseCase(repo);

    await expect(useCase.execute({ id: 'cat-1' })).resolves.toBeUndefined();
    expect(repo.findById).toHaveBeenCalledWith('cat-1');
    expect(repo.countProducts).toHaveBeenCalledWith('cat-1');
    expect(repo.delete).toHaveBeenCalledWith('cat-1');
  });

  it('blocks deletion when the category is in use', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => makeCategory()),
      countProducts: vi.fn(async () => 2),
      delete: vi.fn(async () => {}),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      update: vi.fn(async (category: CategoryEntity) => category),
    };
    const useCase = new DeleteCategoryUseCase(repo);

    await expect(useCase.execute({ id: 'cat-1' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the category does not exist', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      countProducts: vi.fn(async () => 0),
      delete: vi.fn(async () => {}),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      update: vi.fn(async (category: CategoryEntity) => category),
    };
    const useCase = new DeleteCategoryUseCase(repo);

    await expect(useCase.execute({ id: 'missing' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repo.countProducts).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
