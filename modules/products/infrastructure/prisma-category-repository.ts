import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/infrastructure/prisma';
import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';
import type { CategoryEntity } from '../domain/entities/category';

export class PrismaCategoryRepository implements CategoryRepository {
  async findAllSorted(): Promise<CategoryEntity[]> {
    const rows = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await prisma.category.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      createdAt: row.createdAt,
    };
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const row = await prisma.category.findUnique({ where: { slug } });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      createdAt: row.createdAt,
    };
  }

  async save(category: CategoryEntity): Promise<CategoryEntity> {
    try {
      const row = await prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          createdAt: category.createdAt,
        },
      });

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
        createdAt: row.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError(
          'Category already exists',
          'Category already exists',
        );
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const productCount = await this.countProducts(id);
    if (productCount > 0) {
      throw new ConflictError('Category is in use', 'Category is in use');
    }

    try {
      await prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundError('Category not found');
      }

      throw error;
    }
  }

  async countProducts(id: string): Promise<number> {
    return prisma.product.count({ where: { categoryId: id } });
  }
}
