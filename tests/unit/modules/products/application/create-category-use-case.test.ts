import { describe, expect, it, vi } from 'vitest';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';

const { randomUUIDMock } = vi.hoisted(() => ({
  randomUUIDMock: vi.fn(() => 'category-1'),
}));

vi.mock('node:crypto', () => ({
  __esModule: true,
  randomUUID: randomUUIDMock,
  default: { randomUUID: randomUUIDMock },
}));

import { CreateCategoryUseCase } from '@/modules/products/application/create-category-use-case';

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return {
    id: 'existing-1',
    name: 'Electronics',
    slug: 'electronics',
    parentId: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CreateCategoryUseCase', () => {
  it('creates a trimmed category and normalizes the slug before saving', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ name: '  Café con leche  ' }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'category-1',
        name: 'Café con leche',
        slug: 'cafe-con-leche',
        parentId: null,
      }),
    );
    expect(repo.findBySlug).toHaveBeenCalledWith('cafe-con-leche');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'category-1',
        name: 'Café con leche',
        slug: 'cafe-con-leche',
        parentId: null,
      }),
    );
  });

  it('rejects duplicate normalized slugs', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => makeCategory()),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ name: 'electronics' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only names before querying the repository', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ name: ' '.repeat(3) }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects names that normalize to an empty slug', async () => {
    const repo: CategoryRepository = {
      findAllSorted: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(useCase.execute({ name: '!!!' })).rejects.toThrow(
      'Category name must contain at least one alphanumeric character',
    );
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
