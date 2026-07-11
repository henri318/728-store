import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import { resolveDisplay } from '@/modules/products/domain/entities/product-translation';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

/**
 * PrismaProductRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies product retrieval with translations and seller data through the
 * actual Prisma adapter (no mocks).
 *
 * FK chain: User → Seller → Product → ProductTranslation
 */
describe('PrismaProductRepository — Integration', () => {
  let repo: PrismaProductRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaProductRepository();

    // Seed prerequisite data
    await prisma.user.upsert({
      where: { id: 'user-seller-prod' },
      create: {
        id: 'user-seller-prod',
        email: 'seller-prod@test.com',
        firstName: 'Seller',
        lastName: 'Owner',
        role: 'DESIGNER',
        passwordHash: 'hashed-pw',
      },
      update: {},
    });

    await prisma.seller.upsert({
      where: { id: 'seller-prod' },
      create: {
        id: 'seller-prod',
        name: 'Product Seller',
        userId: 'user-seller-prod',
        status: 'active',
      },
      update: {},
    });

    await prisma.product.upsert({
      where: { id: 'prod-int-1' },
      create: {
        id: 'prod-int-1',
        basePrice: 99.99,
        sellerId: 'seller-prod',
      },
      update: {},
    });

    await prisma.productTranslation.createMany({
      data: [
        {
          productId: 'prod-int-1',
          locale: 'es',
          name: 'Camiseta Test',
          description: 'Una camiseta de prueba',
          tags: ['ropa', 'algodon'],
          sizes: ['S', 'M'],
          designChangeDescription: 'Versión base para vendedores',
        },
        {
          productId: 'prod-int-1',
          locale: 'en',
          name: 'Test T-Shirt',
          description: 'A test t-shirt',
          tags: ['clothing'],
          sizes: ['M'],
          designChangeDescription: 'Seller-only note',
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await cleanupDb();
  });

  describe('findAll', () => {
    it('should return products with translations for given locale', async () => {
      const products = await repo.findAll('es');
      expect(products.length).toBeGreaterThanOrEqual(1);

      const product = products.find((p) => p.id === 'prod-int-1');
      expect(product).toBeDefined();
      expect(product!.basePrice.amount).toBeCloseTo(99.99, 2);
      expect(product!.sellerName).toBe('Product Seller');
      expect(product!.translations).toHaveLength(2);
      const esTranslation = product!.translations.find(
        (translation) => translation.locale === 'es',
      );
      expect(esTranslation?.name).toBe('Camiseta Test');
      expect(esTranslation?.tags).toEqual(['ropa', 'algodon']);
      expect(esTranslation?.sizes).toEqual(['S', 'M']);
      expect(esTranslation?.designChangeDescription).toBe(
        'Versión base para vendedores',
      );
    });

    it('should retain all translation rows even when a requested locale is missing', async () => {
      const products = await repo.findAll('fr');
      const ourProduct = products.find((p) => p.id === 'prod-int-1');
      if (ourProduct) {
        expect(ourProduct.translations).toHaveLength(2);
        expect(ourProduct.translations.map((t) => t.locale)).toEqual(
          expect.arrayContaining(['es', 'en']),
        );
      }
    });
  });

  describe('findById', () => {
    it('should return a product by ID with translations', async () => {
      const product = await repo.findById('prod-int-1', 'en');
      expect(product).not.toBeNull();
      expect(product!.id).toBe('prod-int-1');
      expect(product!.basePrice.amount).toBeCloseTo(99.99, 2);
      expect(product!.sellerName).toBe('Product Seller');
      expect(product!.translations[0].name).toBe('Test T-Shirt');
    });

    it('persists and loads images ordered by purpose then position', async () => {
      const images = [
        {
          id: 'img-cover',
          url: 'https://example.com/cover.jpg',
          alt: 'Cover',
          position: 1,
          purpose: ProductImagePurpose.COVER,
          mimeType: 'image/jpeg',
          posterUrl: null,
        },
        {
          id: 'img-showcase',
          url: 'https://example.com/showcase.mp4',
          alt: 'Showcase',
          position: 0,
          purpose: ProductImagePurpose.SHOWCASE,
          mimeType: 'video/mp4',
          posterUrl: 'https://example.com/poster.jpg',
        },
      ] satisfies Prisma.ProductImageCreateWithoutProductInput[];

      await prisma.product.update({
        where: { id: 'prod-int-1' },
        data: {
          images: {
            create: images,
          },
        },
      });

      const product = await repo.findById('prod-int-1', 'es');

      expect(product?.images.map((image) => image.id)).toEqual([
        'img-cover',
        'img-showcase',
      ]);
      expect(product?.images[0].purpose).toBe(ProductImagePurpose.COVER);
      expect(product?.images[0].mimeType).toBe('image/jpeg');
      expect(product?.images[0].posterUrl).toBeNull();
      expect(product?.images[1].purpose).toBe(ProductImagePurpose.SHOWCASE);
      expect(product?.images[1].mimeType).toBe('video/mp4');
      expect(product?.images[1].posterUrl).toBe(
        'https://example.com/poster.jpg',
      );
    });

    it('should return null for non-existent ID', async () => {
      const product = await repo.findById('non-existent', 'es');
      expect(product).toBeNull();
    });

    it('should preserve translation rows and allow fallback resolution end-to-end', async () => {
      await prisma.product.upsert({
        where: { id: 'prod-int-2' },
        create: {
          id: 'prod-int-2',
          basePrice: 49.99,
          sellerId: 'seller-prod',
        },
        update: {},
      });

      await prisma.productTranslation.createMany({
        data: [
          {
            productId: 'prod-int-2',
            locale: 'cat',
            name: 'Samarreta Test',
            description: 'Una samarreta de prova',
            tags: ['roba'],
            sizes: ['L'],
            designChangeDescription: null,
          },
        ],
        skipDuplicates: true,
      });

      const requested = await repo.findById('prod-int-1', 'en');
      const catProduct = await repo.findById('prod-int-2', 'es');
      const esFallback = resolveDisplay(requested?.translations ?? [], 'fr');
      const anyFallback = resolveDisplay(catProduct?.translations ?? [], 'es');

      expect(requested).not.toBeNull();
      expect(esFallback?.locale).toBe('es');
      expect(anyFallback?.locale).toBe('cat');
      expect(resolveDisplay([], 'es')).toBeNull();
    });
  });

  describe('findPaginated', () => {
    beforeAll(async () => {
      // Seed prerequisite user/seller for pagination products
      await prisma.user.upsert({
        where: { id: 'user-pag' },
        create: {
          id: 'user-pag',
          email: 'pag@test.com',
          firstName: 'Pag',
          lastName: 'Seller',
          role: 'DESIGNER',
          passwordHash: 'hashed-pw',
        },
        update: {},
      });

      await prisma.seller.upsert({
        where: { id: 'seller-pag' },
        create: {
          id: 'seller-pag',
          name: 'Pagination Seller',
          userId: 'user-pag',
          status: 'active',
        },
        update: {},
      });

      await prisma.categoryTranslation.deleteMany({
        where: {
          categoryId: { in: ['cat-pag-clothing', 'cat-pag-shoes'] },
        },
      });

      await prisma.category.upsert({
        where: { id: 'cat-pag-clothing' },
        create: {
          id: 'cat-pag-clothing',
          slug: 'clothing',
          translations: {
            create: [{ locale: 'es', name: 'Ropa' }],
          },
        },
        update: {
          translations: {
            create: [{ locale: 'es', name: 'Ropa' }],
          },
        },
      });

      await prisma.category.upsert({
        where: { id: 'cat-pag-shoes' },
        create: {
          id: 'cat-pag-shoes',
          slug: 'shoes',
          translations: {
            create: [{ locale: 'es', name: 'Zapatos' }],
          },
        },
        update: {
          translations: {
            create: [{ locale: 'es', name: 'Zapatos' }],
          },
        },
      });

      await prisma.tag.upsert({
        where: { id: 'tag-cotton' },
        create: { id: 'tag-cotton', name: 'Cotton', slug: 'cotton' },
        update: {},
      });

      await prisma.tag.upsert({
        where: { id: 'tag-blue' },
        create: { id: 'tag-blue', name: 'Blue', slug: 'blue' },
        update: {},
      });

      const products = [
        {
          id: 'prod-pag-1',
          basePrice: 10,
          sellerId: 'seller-pag',
          categoryId: 'cat-pag-clothing',
          createdAt: new Date('2025-01-03'),
        },
        {
          id: 'prod-pag-2',
          basePrice: 20,
          sellerId: 'seller-pag',
          categoryId: 'cat-pag-clothing',
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'prod-pag-3',
          basePrice: 30,
          sellerId: 'seller-pag',
          categoryId: 'cat-pag-shoes',
          createdAt: new Date('2025-01-02'),
        },
      ];

      for (const product of products) {
        await prisma.product.upsert({
          where: { id: product.id },
          create: product,
          update: {},
        });
      }

      await prisma.productTranslation.createMany({
        data: [
          {
            productId: 'prod-pag-1',
            locale: 'es',
            name: 'Camiseta',
            description: 'Una camiseta de algodón',
          },
          {
            productId: 'prod-pag-2',
            locale: 'es',
            name: 'Pantalón',
            description: 'Pantalón de algodón',
          },
          {
            productId: 'prod-pag-3',
            locale: 'es',
            name: 'Zapatos',
            description: 'Zapatos azules',
          },
        ],
        skipDuplicates: true,
      });

      await prisma.product.update({
        where: { id: 'prod-pag-1' },
        data: {
          tags: { connect: [{ id: 'tag-cotton' }, { id: 'tag-blue' }] },
        },
      });

      await prisma.product.update({
        where: { id: 'prod-pag-2' },
        data: {
          tags: { connect: [{ id: 'tag-cotton' }] },
        },
      });

      await prisma.product.update({
        where: { id: 'prod-pag-3' },
        data: {
          tags: { connect: [{ id: 'tag-blue' }] },
        },
      });
    });

    it('returns paginated products with default sort by createdAt desc', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        page: 1,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.items[0].id).toBe('prod-pag-1');
      expect(result.items[1].id).toBe('prod-pag-3');
    });

    it('returns empty items when page is beyond range', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        page: 99,
        pageSize: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(1);
    });

    it('filters by q across name and description scoped to locale', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        q: 'algodón',
      });

      expect(result.items).toHaveLength(2);
      expect(
        result.items.map((p) => p.id).toSorted((a, b) => a.localeCompare(b)),
      ).toEqual(['prod-pag-1', 'prod-pag-2']);
    });

    it('filters by category slug', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        category: 'clothing',
      });

      expect(result.items).toHaveLength(2);
      expect(
        result.items.map((p) => p.id).toSorted((a, b) => a.localeCompare(b)),
      ).toEqual(['prod-pag-1', 'prod-pag-2']);
    });

    it('returns empty result for unknown category slug', async () => {
      const result = await repo.findPaginated({ category: 'does-not-exist' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by tags with ANY-match semantics', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        tags: ['cotton', 'blue'],
      });

      expect(result.items).toHaveLength(3);
      expect(
        result.items.map((p) => p.id).toSorted((a, b) => a.localeCompare(b)),
      ).toEqual(['prod-pag-1', 'prod-pag-2', 'prod-pag-3']);
    });

    it('filters by q, category and tags AND-composed', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        q: 'algodón',
        category: 'clothing',
        tags: ['cotton'],
      });

      expect(result.items).toHaveLength(2);
      expect(
        result.items.map((p) => p.id).toSorted((a, b) => a.localeCompare(b)),
      ).toEqual(['prod-pag-1', 'prod-pag-2']);
    });

    it('filters by sellerId', async () => {
      const result = await repo.findPaginated({ sellerId: 'seller-pag' });

      expect(result.total).toBe(3);
    });

    it('returns empty result for non-existent sellerId', async () => {
      const result = await repo.findPaginated({ sellerId: 'ghost' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('includes category, tags and translations eagerly', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        page: 1,
        pageSize: 1,
      });

      expect(result.items[0].categoryId).toBe('cat-pag-clothing');
      expect(result.items[0].category).not.toBeNull();
      expect(result.items[0].category?.id).toBe('cat-pag-clothing');
      expect(result.items[0].category?.slug).toBe('clothing');
      expect(result.items[0].category?.translations).toEqual([
        { locale: 'es', name: 'Ropa' },
      ]);
      expect(result.items[0].tags.length).toBeGreaterThan(0);
      expect(result.items[0].translations.length).toBeGreaterThan(0);
    });

    it('falls back to es translation when querying unsupported locale', async () => {
      await prisma.productTranslation.createMany({
        data: [
          {
            productId: 'prod-pag-1',
            locale: 'fr',
            name: 'T-shirt',
            description: 'Un t-shirt en coton',
          },
        ],
        skipDuplicates: true,
      });

      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        q: 'zapatos',
        lang: 'fr',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('prod-pag-3');
      expect(result.items[0].translations.map((t) => t.locale)).toContain('es');
    });

    it('prefers requested locale match when both requested locale and es exist', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        q: 't-shirt',
        lang: 'fr',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('prod-pag-1');
    });

    it('sorts by createdAt ascending', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        sortBy: 'createdAt',
        sortDir: 'asc',
      });

      expect(result.items.map((p) => p.id)).toEqual([
        'prod-pag-2',
        'prod-pag-3',
        'prod-pag-1',
      ]);
    });
  });
});
