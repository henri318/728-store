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

describe('CreateCategoryUseCase', () => {
  it('creates a trimmed category and normalizes the slug before saving', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({
        nameEs: '  Café con leche  ',
        nameCat: '  Cafè amb llet  ',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'category-1',
        slug: 'cafe-con-leche',
        parentId: null,
        translations: [
          { locale: 'es', name: 'Café con leche' },
          { locale: 'cat', name: 'Cafè amb llet' },
        ],
      }),
    );
    expect(repo.findBySlug).toHaveBeenCalledWith('cafe-con-leche');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'category-1',
        slug: 'cafe-con-leche',
        parentId: null,
      }),
    );
  });

  it('rejects duplicate normalized slugs', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => makeCategory()),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ nameEs: 'electronics', nameCat: 'electrònica' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only names before querying the repository', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ nameEs: ' '.repeat(3), nameCat: 'Roba' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects names that normalize to an empty slug', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      save: vi.fn(async (category: CategoryEntity) => category),
      delete: vi.fn(async () => {}),
      countProducts: vi.fn(async () => 0),
    };
    const useCase = new CreateCategoryUseCase(repo);

    await expect(
      useCase.execute({ nameEs: '!!!', nameCat: '!!!' }),
    ).rejects.toThrow(
      'Category name must contain at least one alphanumeric character',
    );
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
