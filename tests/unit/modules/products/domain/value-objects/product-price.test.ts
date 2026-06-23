import { describe, it, expect } from 'vitest';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('ProductPrice', () => {
  describe('create()', () => {
    it('should create with valid amount and currency', () => {
      const price = ProductPrice.create(25.0, Currency.EUR);
      expect(price).toBeInstanceOf(ProductPrice);
      expect(price.amount).toBe(25.0);
      expect(price.currency).toBe(Currency.EUR);
    });

    it('should create with integer amount', () => {
      const price = ProductPrice.create(100, Currency.USD);
      expect(price.amount).toBe(100);
      expect(price.currency).toBe(Currency.USD);
    });

    it('should create with small positive amount', () => {
      const price = ProductPrice.create(0.01, Currency.EUR);
      expect(price.amount).toBe(0.01);
    });

    it('should reject zero amount', () => {
      expect(() => ProductPrice.create(0, Currency.EUR)).toThrow(
        'ProductPrice amount must be greater than zero',
      );
    });

    it('should reject negative amount (caught by Money)', () => {
      expect(() => ProductPrice.create(-10, Currency.EUR)).toThrow(
        'Money amount cannot be negative',
      );
    });

    it('should reject NaN', () => {
      expect(() => ProductPrice.create(NaN, Currency.EUR)).toThrow();
    });

    it('should reject Infinity', () => {
      expect(() => ProductPrice.create(Infinity, Currency.EUR)).toThrow();
    });
  });

  describe('equals()', () => {
    it('should return true for the same amount and currency', () => {
      const a = ProductPrice.create(25.0, Currency.EUR);
      const b = ProductPrice.create(25.0, Currency.EUR);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amount', () => {
      const a = ProductPrice.create(25.0, Currency.EUR);
      const b = ProductPrice.create(30.0, Currency.EUR);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different currency', () => {
      const a = ProductPrice.create(25.0, Currency.EUR);
      const b = ProductPrice.create(25.0, Currency.USD);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('delegates to Money', () => {
    it('should expose Money behavior via price', () => {
      const price = ProductPrice.create(50.0, Currency.EUR);
      expect(price.money).toBeDefined();
      expect(price.money.amount).toBe(50.0);
      expect(price.money.currency).toBe(Currency.EUR);
    });
  });
});
