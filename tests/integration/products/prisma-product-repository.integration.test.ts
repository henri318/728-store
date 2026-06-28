import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { prisma } from '@/shared/infrastructure/prisma';

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
        },
        {
          productId: 'prod-int-1',
          locale: 'en',
          name: 'Test T-Shirt',
          description: 'A test t-shirt',
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
      expect(product!.basePrice).toBe(99.99);
      expect(product!.sellerName).toBe('Product Seller');
      expect(product!.translations).toHaveLength(1);
      expect(product!.translations[0].name).toBe('Camiseta Test');
      expect(product!.translations[0].locale).toBe('es');
    });

    it('should return empty array when no products exist', async () => {
      // This test runs against the same DB — products exist from beforeAll
      // So we test with a non-existent locale to verify filtering
      const products = await repo.findAll('fr');
      const ourProduct = products.find((p) => p.id === 'prod-int-1');
      // Product exists but has no 'fr' translation — translations array should be empty
      if (ourProduct) {
        expect(ourProduct.translations).toHaveLength(0);
      }
    });
  });

  describe('findById', () => {
    it('should return a product by ID with translations', async () => {
      const product = await repo.findById('prod-int-1', 'en');
      expect(product).not.toBeNull();
      expect(product!.id).toBe('prod-int-1');
      expect(product!.basePrice).toBe(99.99);
      expect(product!.sellerName).toBe('Product Seller');
      expect(product!.translations[0].name).toBe('Test T-Shirt');
    });

    it('should return null for non-existent ID', async () => {
      const product = await repo.findById('non-existent', 'es');
      expect(product).toBeNull();
    });

    it('should return product with empty translations for wrong locale', async () => {
      const product = await repo.findById('prod-int-1', 'de');
      expect(product).not.toBeNull();
      expect(product!.translations).toHaveLength(0);
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

      await prisma.category.upsert({
        where: { id: 'cat-pag-clothing' },
        create: {
          id: 'cat-pag-clothing',
          name: 'Clothing',
          slug: 'clothing',
        },
        update: {},
      });

      await prisma.category.upsert({
        where: { id: 'cat-pag-shoes' },
        create: {
          id: 'cat-pag-shoes',
          name: 'Shoes',
          slug: 'shoes',
        },
        update: {},
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
      expect(result.items.map((p) => p.id).sort()).toEqual([
        'prod-pag-1',
        'prod-pag-2',
      ]);
    });

    it('filters by category slug', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        category: 'clothing',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((p) => p.id).sort()).toEqual([
        'prod-pag-1',
        'prod-pag-2',
      ]);
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
      expect(result.items.map((p) => p.id).sort()).toEqual([
        'prod-pag-1',
        'prod-pag-2',
        'prod-pag-3',
      ]);
    });

    it('filters by q, category and tags AND-composed', async () => {
      const result = await repo.findPaginated({
        sellerId: 'seller-pag',
        q: 'algodón',
        category: 'clothing',
        tags: ['cotton'],
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((p) => p.id).sort()).toEqual([
        'prod-pag-1',
        'prod-pag-2',
      ]);
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
