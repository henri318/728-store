import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const categories: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    createdAt: Date;
  }> = [];

  const products: Array<{ id: string; categoryId: string | null }> = [];

  const prismaMock = {
    category: {
      findMany: vi.fn(
        async ({ orderBy }: { orderBy?: { name: 'asc' | 'desc' } }) => {
          const rows = [...categories];
          if (orderBy?.name === 'asc') {
            rows.sort((a, b) => a.name.localeCompare(b.name));
          }
          return rows;
        },
      ),
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; slug?: string } }) =>
          categories.find(
            (category) =>
              (where.id !== undefined && category.id === where.id) ||
              (where.slug !== undefined && category.slug === where.slug),
          ) ?? null,
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            id: string;
            name: string;
            slug: string;
            parentId?: string | null;
            createdAt?: Date;
          };
        }) => {
          if (categories.some((category) => category.slug === data.slug)) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed on the fields: (`slug`)',
              {
                code: 'P2002',
                clientVersion: 'mock',
              },
            );
          }

          const row = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            parentId: data.parentId ?? null,
            createdAt: data.createdAt ?? new Date('2026-07-09T00:00:00.000Z'),
          };
          categories.push(row);
          return row;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = categories.findIndex(
          (category) => category.id === where.id,
        );
        if (index === -1) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Record to delete does not exist.',
            {
              code: 'P2025',
              clientVersion: 'mock',
            },
          );
        }

        categories.splice(index, 1);
      }),
      count: vi.fn(async ({ where }: { where?: { slug?: string } }) => {
        if (where?.slug) {
          return categories.filter((category) => category.slug === where.slug)
            .length;
        }

        return categories.length;
      }),
    },
    product: {
      count: vi.fn(async ({ where }: { where?: { categoryId?: string } }) => {
        if (where?.categoryId) {
          return products.filter(
            (product) => product.categoryId === where.categoryId,
          ).length;
        }

        return products.length;
      }),
    },
  };

  return { categories, products, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: store.prismaMock,
}));

import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';
import { PrismaCategoryRepository } from '@/modules/products/infrastructure/prisma-category-repository';

describe('PrismaCategoryRepository', () => {
  beforeEach(() => {
    store.categories.length = 0;
    store.products.length = 0;
    vi.clearAllMocks();
  });

  it('lists categories in alphabetical order and looks them up by slug', async () => {
    store.categories.push(
      {
        id: 'cat-2',
        name: 'Books',
        slug: 'books',
        parentId: null,
        createdAt: new Date('2026-07-09T00:00:00.000Z'),
      },
      {
        id: 'cat-1',
        name: 'Art',
        slug: 'art',
        parentId: null,
        createdAt: new Date('2026-07-08T00:00:00.000Z'),
      },
    );

    const repo = new PrismaCategoryRepository();

    await expect(repo.findAllSorted()).resolves.toEqual([
      expect.objectContaining({ name: 'Art', slug: 'art' }),
      expect.objectContaining({ name: 'Books', slug: 'books' }),
    ]);
    await expect(repo.findBySlug('books')).resolves.toEqual(
      expect.objectContaining({ id: 'cat-2' }),
    );
    expect(store.prismaMock.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
    expect(store.prismaMock.category.findUnique).toHaveBeenCalledWith({
      where: { slug: 'books' },
    });
  });

  it('saves categories and rejects duplicate slugs with ConflictError', async () => {
    const repo = new PrismaCategoryRepository();

    const created = await repo.save({
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      parentId: null,
      createdAt: new Date('2026-07-09T00:00:00.000Z'),
    });

    expect(created.slug).toBe('electronics');
    expect(store.prismaMock.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'electronics' }),
    });

    await expect(
      repo.save({
        id: 'cat-2',
        name: 'electronics',
        slug: 'electronics',
        parentId: null,
        createdAt: new Date('2026-07-09T00:01:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('counts products and blocks deletion when the category is in use', async () => {
    store.categories.push({
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      parentId: null,
      createdAt: new Date('2026-07-09T00:00:00.000Z'),
    });
    store.products.push({ id: 'p-1', categoryId: 'cat-1' });

    const repo = new PrismaCategoryRepository();

    await expect(repo.countProducts('cat-1')).resolves.toBe(1);
    await expect(repo.delete('cat-1')).rejects.toBeInstanceOf(ConflictError);
    expect(store.prismaMock.product.count).toHaveBeenCalledWith({
      where: { categoryId: 'cat-1' },
    });
    expect(store.prismaMock.category.delete).not.toHaveBeenCalled();
  });

  it('deletes unused categories and maps missing rows to NotFoundError', async () => {
    store.categories.push({
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      parentId: null,
      createdAt: new Date('2026-07-09T00:00:00.000Z'),
    });

    const repo = new PrismaCategoryRepository();

    await expect(repo.delete('cat-1')).resolves.toBeUndefined();
    await expect(repo.delete('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
