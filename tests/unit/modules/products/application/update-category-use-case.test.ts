import { describe, expect, it, vi } from 'vitest';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';
import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import { UpdateCategoryUseCase } from '@/modules/products/application/update-category-use-case';

function category(): CategoryEntity {
  return {
    id: 'cat-1',
    slug: 'old-name',
    parentId: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    translations: [
      { locale: 'es', name: 'Old name' },
      { locale: 'cat', name: 'Nom antic' },
    ],
  };
}

function repository(
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    findAll: vi.fn(async () => []),
    findById: vi.fn(async () => category()),
    findBySlug: vi.fn(async () => null),
    save: vi.fn(async (value) => value),
    update: vi.fn(async (value) => value),
    delete: vi.fn(async () => {}),
    countProducts: vi.fn(async () => 0),
    ...overrides,
  };
}

describe('UpdateCategoryUseCase', () => {
  it('updates both translations and regenerates the slug', async () => {
    const repo = repository();
    const updated = await new UpdateCategoryUseCase(repo).execute({
      id: 'cat-1',
      nameEs: '  Home & Garden ',
      nameCat: ' Llar i jardí ',
    });

    expect(updated.slug).toBe('home-garden');
    expect(updated.translations).toEqual([
      { locale: 'es', name: 'Home & Garden' },
      { locale: 'cat', name: 'Llar i jardí' },
    ]);
    expect(repo.update).toHaveBeenCalledWith(updated);
  });

  it('rejects missing categories and incomplete names without writing', async () => {
    const repo = repository({ findById: vi.fn(async () => null) });
    await expect(
      new UpdateCategoryUseCase(repo).execute({
        id: 'missing',
        nameEs: 'Ropa',
        nameCat: 'Roba',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const existingRepo = repository();
    await expect(
      new UpdateCategoryUseCase(existingRepo).execute({
        id: 'cat-1',
        nameEs: ' ',
        nameCat: 'Roba',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(existingRepo.update).not.toHaveBeenCalled();
  });
});
