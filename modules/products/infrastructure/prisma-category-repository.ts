import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/infrastructure/prisma';
import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';
import type { CategoryRepository } from '../domain/category-repository';
import type { CategoryEntity } from '../domain/entities/category';
import { toDomainCategory, toPersistenceCategory } from './mapper';

export class PrismaCategoryRepository implements CategoryRepository {
  async findAll(): Promise<CategoryEntity[]> {
    const rows = await prisma.category.findMany({
      include: { translations: true },
    });
    return rows.map((row) => toDomainCategory(row));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!row) return null;

    return toDomainCategory(row);
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const row = await prisma.category.findUnique({
      where: { slug },
      include: { translations: true },
    });
    if (!row) return null;

    return toDomainCategory(row);
  }

  async save(category: CategoryEntity): Promise<CategoryEntity> {
    try {
      const data = toPersistenceCategory(category);
      const row = await prisma.category.create({
        data,
        include: { translations: true },
      });
      return toDomainCategory(row);
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

  async update(category: CategoryEntity): Promise<CategoryEntity> {
    try {
      const row = await prisma.category.update({
        where: { id: category.id },
        data: {
          slug: category.slug,
          parentId: category.parentId,
          translations: {
            deleteMany: {},
            create: category.translations.map((translation) => ({
              locale: translation.locale,
              name: translation.name,
            })),
          },
        },
        include: { translations: true },
      });
      return toDomainCategory(row);
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundError('Category not found');
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
