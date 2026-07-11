import { describe, expect, it, vi } from 'vitest';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';

const category = (id: string, es: string, cat: string): CategoryEntity => ({
  id,
  slug: id,
  parentId: null,
  createdAt: new Date(),
  translations: [
    { locale: 'es', name: es },
    { locale: 'cat', name: cat },
  ],
});

describe('ListCategoriesUseCase', () => {
  it('resolves and sorts using Catalan labels', async () => {
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => [
        category('ropa', 'Ropa', 'Roba'),
        category('electronica', 'Electrónica', 'Electrònica'),
        category('juguete', 'Juguete', 'Joguet'),
      ]),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      countProducts: vi.fn(),
    };
    const result = await new ListCategoriesUseCase(repo).execute('cat');
    expect(
      result.map(
        (item) => item.translations?.find((t) => t.locale === 'cat')?.name,
      ),
    ).toEqual(['Electrònica', 'Joguet', 'Roba']);
  });

  it('uses Spanish for ordering and preserves fallback categories', async () => {
    const fallback = category('ropa', 'Ropa', 'Roba');
    const repo: CategoryRepository = {
      findAll: vi.fn(async () => [
        fallback,
        category('a', 'Alimentos', 'Aliments'),
      ]),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      countProducts: vi.fn(),
    };
    const result = await new ListCategoriesUseCase(repo).execute('es');
    expect(result.map((item) => item.id)).toEqual(['a', 'ropa']);
  });
});
