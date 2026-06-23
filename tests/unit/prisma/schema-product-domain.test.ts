import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Schema validation tests for product-domain-model changes.
 * Verifies that the Prisma schema contains the required fields and models.
 */
describe('Product Domain Model Schema', () => {
  const schemaPath = join(process.cwd(), 'prisma/schema.prisma');
  let schemaContent: string;

  beforeAll(() => {
    schemaContent = readFileSync(schemaPath, 'utf-8');
  });

  describe('Product model extensions', () => {
    it('should have status field with default ACTIVE', () => {
      // Find the Product model section
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(/status\s+String\s+@default\("ACTIVE"\)/);
    });

    it('should have categoryId field as optional String', () => {
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(/categoryId\s+String\?/);
    });

    it('should have category relation to Category model', () => {
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(
        /category\s+Category\?\s+@relation\(fields: \[categoryId\], references: \[id\]\)/,
      );
    });

    it('should have updatedAt field with @updatedAt', () => {
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(
        /updatedAt\s+DateTime\s+@default\(now\(\)\)\s+@updatedAt/,
      );
    });

    it('should have images relation to ProductImage[]', () => {
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(/images\s+ProductImage\[\]/);
    });

    it('should have tags relation with ProductTags', () => {
      const productModelMatch = schemaContent.match(
        /model Product \{[\s\S]*?\n\}/,
      );
      expect(productModelMatch).not.toBeNull();

      const productModel = productModelMatch![0];
      expect(productModel).toMatch(
        /tags\s+Tag\[\]\s+@relation\("ProductTags"\)/,
      );
    });
  });

  describe('ProductImage model', () => {
    it('should have ProductImage model defined', () => {
      const productImageModelMatch = schemaContent.match(
        /model ProductImage \{[\s\S]*?\n\}/,
      );
      expect(productImageModelMatch).not.toBeNull();
    });

    it('should have required fields: id, url, alt, position, productId, createdAt', () => {
      const productImageModelMatch = schemaContent.match(
        /model ProductImage \{[\s\S]*?\n\}/,
      );
      expect(productImageModelMatch).not.toBeNull();

      const model = productImageModelMatch![0];
      expect(model).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
      expect(model).toMatch(/url\s+String/);
      expect(model).toMatch(/alt\s+String\?/);
      expect(model).toMatch(/position\s+Int/);
      expect(model).toMatch(/productId\s+String/);
      expect(model).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('should have product relation with onDelete: Cascade', () => {
      const productImageModelMatch = schemaContent.match(
        /model ProductImage \{[\s\S]*?\n\}/,
      );
      expect(productImageModelMatch).not.toBeNull();

      const model = productImageModelMatch![0];
      expect(model).toMatch(
        /product\s+Product\s+@relation\(fields: \[productId\], references: \[id\], onDelete: Cascade\)/,
      );
    });

    it('should have composite index on [productId, position]', () => {
      const productImageModelMatch = schemaContent.match(
        /model ProductImage \{[\s\S]*?\n\}/,
      );
      expect(productImageModelMatch).not.toBeNull();

      const model = productImageModelMatch![0];
      expect(model).toMatch(/@@index\(\[productId, position\]\)/);
    });
  });

  describe('Tag model', () => {
    it('should have Tag model defined', () => {
      const tagModelMatch = schemaContent.match(/model Tag \{[\s\S]*?\n\}/);
      expect(tagModelMatch).not.toBeNull();
    });

    it('should have required fields: id, name, slug, createdAt', () => {
      const tagModelMatch = schemaContent.match(/model Tag \{[\s\S]*?\n\}/);
      expect(tagModelMatch).not.toBeNull();

      const model = tagModelMatch![0];
      expect(model).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
      expect(model).toMatch(/name\s+String\s+@unique/);
      expect(model).toMatch(/slug\s+String\s+@unique/);
      expect(model).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('should have products relation with ProductTags', () => {
      const tagModelMatch = schemaContent.match(/model Tag \{[\s\S]*?\n\}/);
      expect(tagModelMatch).not.toBeNull();

      const model = tagModelMatch![0];
      expect(model).toMatch(
        /products\s+Product\[\]\s+@relation\("ProductTags"\)/,
      );
    });
  });

  describe('Category model', () => {
    it('should have Category model defined', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();
    });

    it('should have required fields: id, name, slug, parentId, createdAt', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
      expect(model).toMatch(/name\s+String/);
      expect(model).toMatch(/slug\s+String\s+@unique/);
      expect(model).toMatch(/parentId\s+String\?/);
      expect(model).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('should have self-referencing parent relation with CategoryHierarchy', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(
        /parent\s+Category\?\s+@relation\("CategoryHierarchy", fields: \[parentId\], references: \[id\]\)/,
      );
    });

    it('should have children relation with CategoryHierarchy', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(
        /children\s+Category\[\]\s+@relation\("CategoryHierarchy"\)/,
      );
    });

    it('should have products relation', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(/products\s+Product\[\]/);
    });

    it('should have index on parentId', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(/@@index\(\[parentId\]\)/);
    });

    it('should have unique constraint on slug (creates index automatically)', () => {
      const categoryModelMatch = schemaContent.match(
        /model Category \{[\s\S]*?\n\}/,
      );
      expect(categoryModelMatch).not.toBeNull();

      const model = categoryModelMatch![0];
      expect(model).toMatch(/slug\s+String\s+@unique/);
    });
  });
});
