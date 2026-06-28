import { describe, it, expect, beforeEach } from 'vitest';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

function makeProduct(
  id: string,
  overrides: Partial<
    Omit<
      import('@/modules/products/domain/product-repository').ProductEntity,
      'id'
    >
  > = {},
): import('@/modules/products/domain/product-repository').ProductEntity {
  return {
    id,
    basePrice: ProductPrice.create(10, Currency.EUR),
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    status: ProductStatus.ACTIVE,
    categoryId: null,
    category: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    translations: [
      { locale: 'es', name: 'Producto', description: 'Un producto' },
    ],
    customizations: [],
    images: [],
    tags: [],
    ...overrides,
  };
}

describe('ProductListQueryUseCase', () => {
  let repo: MemoryProductRepository;
  let useCase: ProductListQueryUseCase;

  beforeEach(() => {
    repo = new MemoryProductRepository();
    useCase = new ProductListQueryUseCase(repo);
  });

  it('returns empty paginated result when no products exist', async () => {
    const result = await useCase.execute({});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(0);
  });

  it('returns paginated products with defaults', async () => {
    repo.seed([
      makeProduct('p1', { createdAt: new Date('2025-01-02') }),
      makeProduct('p2', { createdAt: new Date('2025-01-01') }),
    ]);

    const result = await useCase.execute({ page: 1, pageSize: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.items[0].id).toBe('p1');
  });

  it('filters by q across name and description in the requested locale', async () => {
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa de verano' },
        ],
      }),
      makeProduct('p2', {
        translations: [
          { locale: 'es', name: 'Pantalón', description: 'Camiseta interior' },
        ],
      }),
      makeProduct('p3', {
        translations: [
          { locale: 'es', name: 'Zapatos', description: 'Calzado' },
        ],
      }),
    ]);

    const result = await useCase.execute({ q: 'camiseta' });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('falls back to es translation when requested locale has no translation', async () => {
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa de verano' },
        ],
      }),
      makeProduct('p2', {
        translations: [
          { locale: 'es', name: 'Pantalón', description: 'Ropa de invierno' },
        ],
      }),
    ]);

    const result = await useCase.execute({ q: 'camiseta', lang: 'fr' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('p1');
    expect(result.items[0].translations[0].locale).toBe('es');
  });

  it('prefers requested locale match when both es and requested locale exist', async () => {
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa' },
          { locale: 'fr', name: 'Chemise', description: 'Vêtement' },
        ],
      }),
      makeProduct('p2', {
        translations: [
          { locale: 'es', name: 'Pantalón', description: 'Camiseta interior' },
          { locale: 'fr', name: 'Pantalon', description: 'Vêtement' },
        ],
      }),
    ]);

    const result = await useCase.execute({ q: 'chemise', lang: 'fr' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('p1');
  });

  it('falls back to es match when q term only exists in es translation', async () => {
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa' },
          { locale: 'fr', name: 'Chemise', description: 'Vêtement' },
        ],
      }),
      makeProduct('p2', {
        translations: [
          {
            locale: 'es',
            name: 'Pantalón',
            description: 'Pantalón de algodón',
          },
          { locale: 'fr', name: 'Pantalon', description: 'Vêtement' },
        ],
      }),
    ]);

    const result = await useCase.execute({ q: 'algodón', lang: 'fr' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('p2');
  });

  it('filters by category slug', async () => {
    repo.seedCategories([
      {
        id: 'cat-1',
        name: 'Ropa',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-2',
        name: 'Zapatos',
        slug: 'shoes',
        parentId: null,
        createdAt: new Date(),
      },
    ]);
    repo.seed([
      makeProduct('p1', { categoryId: 'cat-1' }),
      makeProduct('p2', { categoryId: 'cat-2' }),
    ]);

    const result = await useCase.execute({ category: 'clothing' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('p1');
  });

  it('filters by tags with ANY-match semantics', async () => {
    repo.seed([
      makeProduct('p1', {
        tags: [
          { id: 't1', name: 'Algodón', slug: 'cotton', createdAt: new Date() },
          { id: 't2', name: 'Azul', slug: 'blue', createdAt: new Date() },
        ],
      }),
      makeProduct('p2', {
        tags: [{ id: 't3', name: 'Rojo', slug: 'red', createdAt: new Date() }],
      }),
      makeProduct('p3', {
        tags: [
          { id: 't1', name: 'Algodón', slug: 'cotton', createdAt: new Date() },
          { id: 't4', name: 'Verde', slug: 'green', createdAt: new Date() },
        ],
      }),
    ]);

    const result = await useCase.execute({ tags: ['cotton', 'blue'] });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('defaults locale to es', async () => {
    repo.seed([
      makeProduct('p1', {
        translations: [
          { locale: 'es', name: 'Camiseta', description: 'Ropa' },
          { locale: 'cat', name: 'Samarreta', description: 'Roba' },
        ],
      }),
    ]);

    const result = await useCase.execute({ q: 'camiseta' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].translations[0].locale).toBe('es');
  });

  it('returns empty page when page is beyond range', async () => {
    repo.seed([makeProduct('p1')]);

    const result = await useCase.execute({ page: 99, pageSize: 10 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('sorts by createdAt ascending', async () => {
    repo.seed([
      makeProduct('p1', { createdAt: new Date('2025-01-03') }),
      makeProduct('p2', { createdAt: new Date('2025-01-01') }),
      makeProduct('p3', { createdAt: new Date('2025-01-02') }),
    ]);

    const result = await useCase.execute({
      sortBy: 'createdAt',
      sortDir: 'asc',
    });

    expect(result.items.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('returns empty result for a non-existent sellerId', async () => {
    repo.seed([makeProduct('p1', { sellerId: 'seller-1' })]);

    const result = await useCase.execute({ sellerId: 'ghost' });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('includes category object on items when category exists', async () => {
    repo.seedCategories([
      {
        id: 'cat-1',
        name: 'Ropa',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
      },
    ]);
    repo.seed([
      makeProduct('p1', { categoryId: 'cat-1' }),
      makeProduct('p2', { categoryId: null }),
    ]);

    const result = await useCase.execute({});

    expect(result.items).toHaveLength(2);
    const withCategory = result.items.find((p) => p.id === 'p1');
    const withoutCategory = result.items.find((p) => p.id === 'p2');
    expect(withCategory?.category).not.toBeNull();
    expect(withCategory?.category?.id).toBe('cat-1');
    expect(withCategory?.category?.slug).toBe('clothing');
    expect(withoutCategory?.category).toBeNull();
  });
});
