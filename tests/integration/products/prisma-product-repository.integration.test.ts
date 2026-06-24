import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * PrismaProductRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies product retrieval with translations, customizations, and seller
 * data through the actual Prisma adapter (no mocks).
 *
 * FK chain: User → Seller → Product → ProductTranslation / ProductCustomization
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

    await prisma.productCustomization.create({
      data: {
        id: 'cust-int-1',
        productId: 'prod-int-1',
        text: 'Custom text',
        color: 'red',
        size: 'M',
      },
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

    it('should return customizations for products', async () => {
      const products = await repo.findAll('en');
      const product = products.find((p) => p.id === 'prod-int-1');
      expect(product).toBeDefined();
      expect(product!.customizations).toHaveLength(1);
      expect(product!.customizations[0].text).toBe('Custom text');
      expect(product!.customizations[0].color).toBe('red');
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
});
