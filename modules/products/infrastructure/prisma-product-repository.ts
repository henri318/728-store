import { prisma } from '@/shared/infrastructure/prisma';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import {
  ProductEntity,
  ProductsListFilter,
  ProductRepository,
} from '../domain/product-repository';
import { toDomainProduct, toPersistenceProduct } from './mapper';
import { normalizeText } from '@/shared/lib/normalize-text';

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

    // Build WHERE conditions WITHOUT the q filter — the search term
    // is matched with PostgreSQL unaccent() for accent-insensitive
    // comparison (handles "café" ↔ "cafe" both directions).
    const where = this.buildWhere(filter, locale, true);

    if (filter.q !== undefined && filter.q !== '') {
      const ids = await this.searchByUnaccent(filter.q, locale);
      if (ids.length > 0) {
        if (Object.keys(where).length === 0) {
          where.id = { in: ids };
        } else {
          if (!Array.isArray(where.AND)) where.AND = [where.AND ?? {}];
          where.AND.push({ id: { in: ids } });
        }
      } else {
        // No matches — force empty result so the Prisma query
        // returns zero items without a full table scan.
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      }
    }

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

  /**
   * Build Prisma WHERE conditions, optionally skipping the q filter.
   * When skipQ is true, the search term is handled separately via
   * `searchByUnaccent()` so the query can use PostgreSQL's unaccent
   * extension for accent-insensitive matching.
   */
  private buildWhere(
    filter: ProductsListFilter,
    locale: string,
    skipQ: boolean = false,
  ): import('@prisma/client').Prisma.ProductWhereInput {
    const conditions: import('@prisma/client').Prisma.ProductWhereInput[] = [];

    // Public audience: force status=ACTIVE. This closes the DRAFT/ARCHIVED
    // leak that the public storefront and `/api/products?audience=public`
    // inherited from the seller/admin paths. Seller and admin audiences
    // see all statuses unchanged.
    if (filter.audience === 'public') {
      conditions.push({ status: 'ACTIVE' });
    }

    if (filter.category !== undefined && filter.category !== '') {
      conditions.push({ category: { slug: filter.category } });
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      conditions.push({ tags: { some: { slug: { in: filter.tags } } } });
    }

    if (!skipQ && filter.q !== undefined && filter.q !== '') {
      // Case-insensitive fallback when unaccent is not needed or
      // when skipQ is false (e.g. seller queries without search).
      conditions.push({
        OR: [
          {
            translations: {
              some: {
                locale: { in: [locale, 'es'] },
                OR: [
                  { name: { contains: filter.q, mode: 'insensitive' } },
                  { description: { contains: filter.q, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            tags: {
              some: {
                OR: [
                  { name: { contains: filter.q, mode: 'insensitive' } },
                  { slug: { contains: filter.q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    if (filter.sellerId !== undefined) {
      conditions.push({ sellerId: filter.sellerId });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Accent-insensitive product ID search using PostgreSQL unaccent().
   * Returns distinct product IDs that match the query against
   * translation name/description or tag name/slug.
   *
   * The unaccent extension MUST be enabled (see migration).
   */
  private async searchByUnaccent(q: string, locale: string): Promise<string[]> {
    let normQ = normalizeText(q);
    // Escape SQL ILIKE wildcards so user input like "100%" or "a_b" is
    // treated literally instead of expanding to unintended patterns.
    normQ = normQ.replace(/%/g, '\\%').replace(/_/g, '\\_');
    // Parameterised placeholders ($1, $2) prevent SQL injection.
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT DISTINCT p.id
       FROM "Product" p
       LEFT JOIN "ProductTranslation" pt
         ON pt."productId" = p.id AND pt.locale IN ($1, 'es')
       LEFT JOIN "_ProductTags" ptags
         ON ptags."A" = p.id
       LEFT JOIN "Tag" t
         ON t.id = ptags."B"
       WHERE unaccent(pt.name) ILIKE unaccent($2)
          OR unaccent(pt.description) ILIKE unaccent($2)
          OR unaccent(t.name) ILIKE unaccent($2)
          OR unaccent(t.slug) ILIKE unaccent($2)`,
      locale,
      `%${normQ}%`,
    );
    return rows.map((r) => r.id);
  }

  async save(entity: ProductEntity): Promise<void> {
    const data = toPersistenceProduct(entity);
    await prisma.product.create({
      data: {
        ...data,
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
    const result = await prisma.product.update({
      where: { id: entity.id },
      data: {
        basePrice: data.basePrice,
        currency: data.currency,
        status: data.status,
        categoryId: data.categoryId,
        updatedAt: data.updatedAt,
      },
    });
    return result !== null;
  }
}
