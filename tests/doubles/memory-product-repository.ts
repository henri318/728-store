import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';
import {
  ProductEntity,
  ProductsListFilter,
  ProductRepository,
} from '@/modules/products/domain/product-repository';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { normalizeText } from '@/shared/lib/normalize-text';

export class MemoryProductRepository implements ProductRepository {
  private products: ProductEntity[] = [];
  private categories: Map<string, CategoryEntity> = new Map();

  private deriveCategory(categoryId: string | null): CategoryEntity | null {
    if (!categoryId) return null;
    return this.categories.get(categoryId) ?? null;
  }

  async findAll(_locale: string): Promise<ProductEntity[]> {
    return this.products.map((p) => ({
      ...p,
      category: this.deriveCategory(p.categoryId),
      translations: p.translations,
    }));
  }

  async findAllPublicForSitemap(): Promise<
    Array<{ id: string; updatedAt: Date }>
  > {
    return this.products
      .filter(
        (product) =>
          product.status === ProductStatus.ACTIVE &&
          product.translations.some(
            (translation) => translation.locale === 'es',
          ) &&
          product.translations.some(
            (translation) => translation.locale === 'cat',
          ),
      )
      .map(({ id, updatedAt }) => ({ id, updatedAt }));
  }

  async findById(
    id: string,
    _locale: string,
    audience?: import('@/modules/products/domain/product-repository').ProductAudience,
  ): Promise<ProductEntity | null> {
    const product = this.products.find((p) => p.id === id);
    if (!product) return null;

    // Public audience: only ACTIVE products are visible.
    if (audience === 'public' && product.status !== ProductStatus.ACTIVE) {
      return null;
    }

    return {
      ...product,
      category: this.deriveCategory(product.categoryId),
      translations: product.translations,
    };
  }

  async findBySellerId(
    sellerId: string,
    _locale: string,
  ): Promise<ProductEntity[]> {
    return this.products
      .filter((p) => p.sellerId === sellerId)
      .map((p) => ({
        ...p,
        category: this.deriveCategory(p.categoryId),
        translations: p.translations,
      }));
  }

  async findPaginated(
    filter: ProductsListFilter,
  ): Promise<PaginatedResult<ProductEntity>> {
    const locale = filter.lang ?? 'es';
    const sortDir = filter.sortDir ?? PaginationDefaults.sortDir;
    const page = filter.page ?? PaginationDefaults.page;
    const pageSize = filter.pageSize ?? PaginationDefaults.pageSize;
    const audience = filter.audience ?? 'seller';
    const isPublic = audience === 'public';

    const filtered = this.products.filter((p) => {
      // Public audience MUST only see ACTIVE products — this is the
      // safety net that closes the DRAFT/ARCHIVED leak from the public
      // API and storefront.
      if (isPublic && p.status !== ProductStatus.ACTIVE) {
        return false;
      }

      if (filter.sellerId !== undefined && p.sellerId !== filter.sellerId) {
        return false;
      }

      if (
        filter.category !== undefined &&
        filter.category !== '' &&
        this.categories.get(p.categoryId ?? '')?.slug !== filter.category
      ) {
        return false;
      }

      if (
        filter.tags !== undefined &&
        filter.tags.length > 0 &&
        p.tags.every((t) => !filter.tags!.includes(t.slug))
      ) {
        return false;
      }

      if (filter.q !== undefined && filter.q !== '') {
        // Normalise both the search term and the stored data so
        // accent-insensitive matching works both directions:
        // "café" matches "cafe" and vice versa.
        const q = normalizeText(filter.q).toLowerCase();

        // Match against the requested locale's name/description first,
        // then fall back to the `es` translation if no match in the
        // requested locale. This mirrors the Prisma adapter's
        // `translations.some({ locale: { in: [locale, 'es'] } })` filter.
        const requested = p.translations.find((t) => t.locale === locale);
        const fallback = p.translations.find((t) => t.locale === 'es');
        const requestedHaystack = normalizeText(
          `${requested?.name ?? ''} ${requested?.description ?? ''}`,
        ).toLowerCase();
        const fallbackHaystack = normalizeText(
          `${fallback?.name ?? ''} ${fallback?.description ?? ''}`,
        ).toLowerCase();
        const translationHit =
          requestedHaystack.includes(q) || fallbackHaystack.includes(q);

        // Match against tag name + tag slug, case-insensitive.
        const tagHit = p.tags.some(
          (t) =>
            normalizeText(t.name).toLowerCase().includes(q) ||
            normalizeText(t.slug).toLowerCase().includes(q),
        );

        if (!translationHit && !tagHit) {
          return false;
        }
      }

      return true;
    });

    const sorted = filtered.toSorted((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map((p) => ({
      ...p,
      category: this.deriveCategory(p.categoryId),
      translations: p.translations,
    }));
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async findSimilar(
    productId: string,
    tagIds: string[],
    _locale: string,
    limit: number = 3,
  ): Promise<ProductEntity[]> {
    if (tagIds.length === 0 || this.products.every((p) => p.id !== productId))
      return [];

    const withSharedTags = this.products
      .filter((p) => p.id !== productId && p.status === ProductStatus.ACTIVE)
      .map((p) => ({
        product: p,
        sharedCount: p.tags.filter((t) => tagIds.includes(t.id)).length,
      }))
      .filter((entry) => entry.sharedCount > 0)
      .toSorted((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, limit)
      .map((entry) => ({
        ...entry.product,
        category: this.deriveCategory(entry.product.categoryId),
        translations: entry.product.translations,
      }));

    return withSharedTags;
  }

  async save(entity: ProductEntity, _tx?: unknown): Promise<void> {
    const index = this.products.findIndex((p) => p.id === entity.id);
    if (index === -1) {
      this.products.push(entity);
    } else {
      this.products[index] = entity;
    }
  }

  async update(entity: ProductEntity, _tx?: unknown): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === entity.id);
    if (index === -1) return false;
    this.products[index] = entity;
    return true;
  }

  // Helpers for testing
  seed(products: ProductEntity[]) {
    this.products = products;
  }

  seedCategories(categories: CategoryEntity[]) {
    this.categories = new Map(categories.map((c) => [c.id, c]));
  }
}
