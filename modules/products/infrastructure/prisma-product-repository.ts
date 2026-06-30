import { prisma } from '@/shared/infrastructure/prisma';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import {
  ProductEntity,
  ProductsListFilter,
  ProductRepository,
} from '../domain/product-repository';
import { toDomainProduct, toPersistenceProduct } from './mapper';

export class PrismaProductRepository implements ProductRepository {
  async findAll(locale: string): Promise<ProductEntity[]> {
    const products = await prisma.product.findMany({
      include: {
        seller: true,
        category: true,
        translations: {
          where: { locale },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        tags: true,
      },
    });

    return products.map((product) => toDomainProduct(product));
  }

  async findById(id: string, locale: string): Promise<ProductEntity | null> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        category: true,
        translations: {
          where: { locale },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        tags: true,
      },
    });

    if (!product) return null;

    return toDomainProduct(product);
  }

  async findBySellerId(
    sellerId: string,
    locale: string,
  ): Promise<ProductEntity[]> {
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: {
        seller: true,
        category: true,
        translations: {
          where: { locale },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        tags: true,
      },
    });

    return products.map((product) => toDomainProduct(product));
  }

  async findPaginated(
    filter: ProductsListFilter,
  ): Promise<PaginatedResult<ProductEntity>> {
    const locale = filter.lang ?? 'es';
    const sortDir = filter.sortDir ?? 'desc';
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where = this.buildWhere(filter, locale);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          seller: true,
          category: true,
          translations: {
            where: { locale: { in: [locale, 'es'] } },
          },
          images: {
            orderBy: { position: 'asc' },
          },
          tags: true,
        },
        orderBy: { createdAt: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products.map((product) => toDomainProduct(product)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private buildWhere(
    filter: ProductsListFilter,
    locale: string,
  ): import('@prisma/client').Prisma.ProductWhereInput {
    const conditions: import('@prisma/client').Prisma.ProductWhereInput[] = [];

    if (filter.category !== undefined && filter.category !== '') {
      conditions.push({ category: { slug: filter.category } });
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      conditions.push({ tags: { some: { slug: { in: filter.tags } } } });
    }

    if (filter.q !== undefined && filter.q !== '') {
      conditions.push({
        translations: {
          some: {
            locale: { in: [locale, 'es'] },
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { description: { contains: filter.q, mode: 'insensitive' } },
            ],
          },
        },
      });
    }

    if (filter.sellerId !== undefined) {
      conditions.push({ sellerId: filter.sellerId });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  async save(entity: ProductEntity): Promise<void> {
    const data = toPersistenceProduct(entity);
    await prisma.product.create({
      data: {
        ...data,
        translations: {
          create: entity.translations.map((translation) => ({
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          })),
        },
        images: {
          create: entity.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
            position: img.position,
            productId: img.productId,
          })),
        },
        tags: {
          connect: entity.tags.map((tag) => ({ id: tag.id })),
        },
      },
    });
  }

  async update(entity: ProductEntity): Promise<boolean> {
    const data = toPersistenceProduct(entity);
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: entity.id },
        data: {
          basePrice: data.basePrice,
          currency: data.currency,
          status: data.status,
          categoryId: data.categoryId,
          customizationConfig: data.customizationConfig,
          updatedAt: data.updatedAt,
        },
      });

      for (const translation of entity.translations) {
        await tx.productTranslation.upsert({
          where: {
            productId_locale: {
              productId: entity.id,
              locale: translation.locale,
            },
          },
          create: {
            productId: entity.id,
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          },
          update: {
            name: translation.name,
            description: translation.description,
          },
        });
      }
    });

    return true;
  }
}
