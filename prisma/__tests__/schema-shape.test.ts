import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Schema shape test — verifies the Prisma schema has the expected models
 * and fields for the Customizations module migration.
 *
 * RED phase: This test fails because the schema still has ProductCustomization
 * and the denormalized customization fields on CartItem/OrderLineItem.
 *
 * GREEN phase: After updating prisma/schema.prisma, this test passes.
 */
describe('Prisma schema shape — Customizations module', () => {
  const schemaPath = path.resolve(__dirname, '../schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  describe('Customization model (renamed from ProductCustomization)', () => {
    it('should have Customization model (not ProductCustomization)', () => {
      expect(schema).toMatch(/model\s+Customization\s*\{/);
      expect(schema).not.toMatch(/model\s+ProductCustomization\s*\{/);
    });

    it('should have sellerId field on Customization', () => {
      expect(schema).toMatch(
        /model\s+Customization\s*\{[^}]*sellerId\s+String/,
      );
    });

    it('should have seller relation on Customization', () => {
      expect(schema).toMatch(
        /model\s+Customization\s*\{[^}]*seller\s+Seller\s+@relation/,
      );
    });

    it('should have indexes on sellerId and productId', () => {
      expect(schema).toMatch(/@@index\(\[sellerId\]\)/);
      expect(schema).toMatch(/@@index\(\[productId\]\)/);
    });
  });

  describe('CartItem model (denormalized fields removed)', () => {
    it('should NOT have customizationText column', () => {
      const cartItemBlock = extractModelBlock(schema, 'CartItem');
      expect(cartItemBlock).not.toMatch(/customizationText/);
    });

    it('should NOT have customizationColor column', () => {
      const cartItemBlock = extractModelBlock(schema, 'CartItem');
      expect(cartItemBlock).not.toMatch(/customizationColor/);
    });

    it('should NOT have customizationSize column', () => {
      const cartItemBlock = extractModelBlock(schema, 'CartItem');
      expect(cartItemBlock).not.toMatch(/customizationSize/);
    });

    it('should NOT have customizationImageUrl column', () => {
      const cartItemBlock = extractModelBlock(schema, 'CartItem');
      expect(cartItemBlock).not.toMatch(/customizationImageUrl/);
    });

    it('should have customizationIdList field', () => {
      const cartItemBlock = extractModelBlock(schema, 'CartItem');
      expect(cartItemBlock).toMatch(/customizationIdList\s+String\[\]/);
    });
  });

  describe('OrderLineItem model (denormalized fields removed, snapshot added)', () => {
    it('should NOT have customizationText column', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).not.toMatch(/customizationText/);
    });

    it('should NOT have customizationColor column', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).not.toMatch(/customizationColor/);
    });

    it('should NOT have customizationSize column', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).not.toMatch(/customizationSize/);
    });

    it('should NOT have customizationImageUrl column', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).not.toMatch(/customizationImageUrl/);
    });

    it('should have customizationIdList field', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).toMatch(/customizationIdList\s+String\[\]/);
    });

    it('should have customizationSnapshot field', () => {
      const block = extractModelBlock(schema, 'OrderLineItem');
      expect(block).toMatch(/customizationSnapshot\s+Json\?/);
    });
  });

  describe('Product model (relation renamed)', () => {
    it('should reference Customization[] not ProductCustomization[]', () => {
      const productBlock = extractModelBlock(schema, 'Product');
      expect(productBlock).toMatch(/customizations\s+Customization\[\]/);
      expect(productBlock).not.toMatch(/ProductCustomization\[\]/);
    });
  });
});

/**
 * Extract the block of a model from the schema file.
 * Returns the text between `model Name {` and the closing `}`.
 */
function extractModelBlock(schema: string, modelName: string): string {
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = schema.match(regex);
  return match ? match[0] : '';
}
