import { describe, it, expect } from 'vitest';
import {
  addItemSchema,
  updateQuantitySchema,
  confirmCheckoutSchema,
  migrateGuestCartSchema,
} from '@/modules/cart/presentation/schemas/cart-schemas';

describe('cart-schemas', () => {
  describe('addItemSchema', () => {
    it('accepts valid input with productId and quantity', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 2,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productId).toBe('prod_123');
        expect(result.data.quantity).toBe(2);
      }
    });

    it('accepts valid input with customization fields', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 1,
        customizationText: 'Hello World',
        customizationColor: 'red',
        customizationSize: 'M',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing productId', () => {
      const result = addItemSchema.safeParse({ quantity: 1 });
      expect(result.success).toBe(false);
    });

    it('rejects empty productId', () => {
      const result = addItemSchema.safeParse({
        productId: '',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity less than 1', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity greater than 99', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer quantity', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('coerces string quantity to number', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(5);
      }
    });

    it('rejects customizationText longer than 500 chars', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 1,
        customizationText: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('rejects customizationColor longer than 50 chars', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 1,
        customizationColor: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('rejects customizationSize longer than 50 chars', () => {
      const result = addItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 1,
        customizationSize: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateQuantitySchema', () => {
    it('accepts valid quantity', () => {
      const result = updateQuantitySchema.safeParse({ quantity: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(5);
      }
    });

    it('rejects quantity less than 1', () => {
      const result = updateQuantitySchema.safeParse({ quantity: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects quantity greater than 99', () => {
      const result = updateQuantitySchema.safeParse({ quantity: 100 });
      expect(result.success).toBe(false);
    });

    it('coerces string quantity to number', () => {
      const result = updateQuantitySchema.safeParse({ quantity: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(10);
      }
    });
  });

  describe('confirmCheckoutSchema', () => {
    it('accepts acceptPriceChanges=true', () => {
      const result = confirmCheckoutSchema.safeParse({
        acceptPriceChanges: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptPriceChanges).toBe(true);
      }
    });

    it('accepts acceptPriceChanges=false', () => {
      const result = confirmCheckoutSchema.safeParse({
        acceptPriceChanges: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptPriceChanges).toBe(false);
      }
    });

    it('rejects missing acceptPriceChanges', () => {
      const result = confirmCheckoutSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-boolean acceptPriceChanges', () => {
      const result = confirmCheckoutSchema.safeParse({
        acceptPriceChanges: 'yes',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('migrateGuestCartSchema', () => {
    it('accepts valid merge strategy', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [
          {
            productId: 'prod_1',
            sellerId: 'seller_1',
            quantity: 2,
            unitPriceSnapshot: 10.5,
          },
        ],
        strategy: 'merge',
      });
      expect(result.success).toBe(true);
    });

    it('accepts keep-server strategy', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [],
        strategy: 'keep-server',
      });
      expect(result.success).toBe(true);
    });

    it('accepts keep-guest strategy', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [],
        strategy: 'keep-guest',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid strategy', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [],
        strategy: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing guestItems', () => {
      const result = migrateGuestCartSchema.safeParse({
        strategy: 'merge',
      });
      expect(result.success).toBe(false);
    });

    it('rejects guestItems with missing productId', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [
          { sellerId: 'seller_1', quantity: 1, unitPriceSnapshot: 10 },
        ],
        strategy: 'merge',
      });
      expect(result.success).toBe(false);
    });

    it('rejects guestItems with quantity less than 1', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [
          {
            productId: 'prod_1',
            sellerId: 'seller_1',
            quantity: 0,
            unitPriceSnapshot: 10,
          },
        ],
        strategy: 'merge',
      });
      expect(result.success).toBe(false);
    });

    it('accepts guestItems with customization fields', () => {
      const result = migrateGuestCartSchema.safeParse({
        guestItems: [
          {
            productId: 'prod_1',
            sellerId: 'seller_1',
            quantity: 1,
            unitPriceSnapshot: 10,
            customizationText: 'Hello',
            customizationColor: 'blue',
            customizationSize: 'L',
          },
        ],
        strategy: 'merge',
      });
      expect(result.success).toBe(true);
    });
  });
});
