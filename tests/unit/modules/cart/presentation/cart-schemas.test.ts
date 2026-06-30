import { describe, it, expect } from 'vitest';
import {
  addItemSchema,
  updateQuantitySchema,
  confirmCheckoutSchema,
  migrateGuestCartSchema,
} from '@/modules/cart/presentation/schemas/cart-schemas';

describe('cart-schemas', () => {
  describe('addItemSchema', () => {
    it.each([
      {
        title: 'defaults customizationIdList when omitted',
        input: { productId: 'prod_123', quantity: 1 },
        customizationIdList: [],
      },
      {
        title: 'preserves a populated customizationIdList',
        input: {
          productId: 'prod_123',
          quantity: 1,
          customizationIdList: ['cust-1', 'cust-2'],
        },
        customizationIdList: ['cust-1', 'cust-2'],
      },
    ])('$title', ({ input, customizationIdList }) => {
      const result = addItemSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productId).toBe('prod_123');
        expect(result.data.quantity).toBe(1);
        expect(result.data.customizationIdList).toEqual(customizationIdList);
      }
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

    it('rejects invalid product and quantity combinations', () => {
      for (const input of [
        { quantity: 1 },
        { productId: '', quantity: 1 },
        { productId: 'prod_123', quantity: 0 },
        { productId: 'prod_123', quantity: 100 },
        { productId: 'prod_123', quantity: 1.5 },
      ]) {
        expect(addItemSchema.safeParse(input).success).toBe(false);
      }
    });

    it('rejects invalid customizationIdList values', () => {
      for (const input of [
        { productId: 'prod_123', quantity: 1, customizationIdList: [''] },
        {
          productId: 'prod_123',
          quantity: 1,
          customizationIdList: 'not-an-array',
        },
      ]) {
        expect(addItemSchema.safeParse(input).success).toBe(false);
      }
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

    it('coerces string quantity to number', () => {
      const result = updateQuantitySchema.safeParse({ quantity: '10' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(10);
      }
    });

    it('rejects invalid quantity values', () => {
      for (const input of [
        { quantity: 0 },
        { quantity: 100 },
        { quantity: 1.5 },
      ]) {
        expect(updateQuantitySchema.safeParse(input).success).toBe(false);
      }
    });
  });

  describe('confirmCheckoutSchema', () => {
    it('accepts boolean values and rejects invalid input', () => {
      for (const value of [true, false]) {
        const result = confirmCheckoutSchema.safeParse({
          acceptPriceChanges: value,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.acceptPriceChanges).toBe(value);
        }
      }

      for (const input of [{}, { acceptPriceChanges: 'yes' }]) {
        expect(confirmCheckoutSchema.safeParse(input).success).toBe(false);
      }
    });
  });

  describe('migrateGuestCartSchema', () => {
    it('accepts valid migration payloads', () => {
      const validPayloads = [
        {
          guestItems: [
            {
              productId: 'prod_1',
              sellerId: 'seller_1',
              quantity: 2,
              unitPriceSnapshot: 10.5,
            },
          ],
          strategy: 'merge',
        },
        { guestItems: [], strategy: 'keep-server' },
        { guestItems: [], strategy: 'keep-guest' },
        {
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
        },
      ] as const;

      for (const input of validPayloads) {
        expect(migrateGuestCartSchema.safeParse(input).success).toBe(true);
      }
    });

    it('rejects invalid migration payloads', () => {
      for (const input of [
        { guestItems: [], strategy: 'invalid' },
        { strategy: 'merge' },
        {
          guestItems: [
            { sellerId: 'seller_1', quantity: 1, unitPriceSnapshot: 10 },
          ],
          strategy: 'merge',
        },
        {
          guestItems: [
            {
              productId: 'prod_1',
              sellerId: 'seller_1',
              quantity: 0,
              unitPriceSnapshot: 10,
            },
          ],
          strategy: 'merge',
        },
      ]) {
        expect(migrateGuestCartSchema.safeParse(input).success).toBe(false);
      }
    });
  });
});
