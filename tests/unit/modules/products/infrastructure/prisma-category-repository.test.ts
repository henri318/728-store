import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const categories: Array<Record<string, unknown>> = [];
  const prismaMock = {
    category: {
      findMany: vi.fn(async () => categories),
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; slug?: string } }) =>
          categories.find(
            (category) => category.id === (where.id ?? where.slug),
          ) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (categories.some((category) => category.slug === data.slug)) {
          throw new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'mock',
          });
        }
        const row = {
          ...data,
          translations: [
            { locale: 'es', name: 'Ropa' },
            { locale: 'cat', name: 'Roba' },
          ],
        };
        categories.push(row);
        return row;
      }),
      delete: vi.fn(async () => {}),
    },
    product: { count: vi.fn(async () => 0) },
  };
  return { categories, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({ prisma: store.prismaMock }));

import { ConflictError } from '@/shared/kernel/app-error';
import { PrismaCategoryRepository } from '@/modules/products/infrastructure/prisma-category-repository';

describe('PrismaCategoryRepository', () => {
  beforeEach(() => {
    store.categories.length = 0;
    vi.clearAllMocks();
  });

  it.each(['findAll', 'findBySlug'])(
    'includes translations for %s reads',
    async (operation) => {
      const repo = new PrismaCategoryRepository();
      if (operation === 'findAll') await repo.findAll();
      else await repo.findBySlug('clothing');
      expect(
        store.prismaMock.category[
          operation === 'findAll' ? 'findMany' : 'findUnique'
        ],
      ).toHaveBeenCalledWith(
        operation === 'findAll'
          ? { include: { translations: true } }
          : { where: { slug: 'clothing' }, include: { translations: true } },
      );
    },
  );

  it('creates only translation-backed rows and maps both labels', async () => {
    const repo = new PrismaCategoryRepository();
    const category = await repo.save({
      id: 'cat-1',
      slug: 'clothing',
      parentId: null,
      createdAt: new Date(),
      translations: [
        { locale: 'es', name: 'Ropa' },
        { locale: 'cat', name: 'Roba' },
      ],
    });
    expect(category.translations).toEqual([
      { locale: 'es', name: 'Ropa' },
      { locale: 'cat', name: 'Roba' },
    ]);
    expect(store.prismaMock.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            create: [
              { locale: 'es', name: 'Ropa' },
              { locale: 'cat', name: 'Roba' },
            ],
          },
        }),
        include: { translations: true },
      }),
    );
  });

  it('rejects duplicate slugs without a legacy write path', async () => {
    const repo = new PrismaCategoryRepository();
    await repo.save({
      id: 'cat-1',
      slug: 'clothing',
      parentId: null,
      createdAt: new Date(),
      translations: [
        { locale: 'es', name: 'Ropa' },
        { locale: 'cat', name: 'Roba' },
      ],
    });
    await expect(
      repo.save({
        id: 'cat-2',
        slug: 'clothing',
        parentId: null,
        createdAt: new Date(),
        translations: [
          { locale: 'es', name: 'Ropa 2' },
          { locale: 'cat', name: 'Roba 2' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
