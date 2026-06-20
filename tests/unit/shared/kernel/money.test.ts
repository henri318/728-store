import { describe, it, expect } from 'vitest';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('Money', () => {
  describe('create()', () => {
    it('should create with valid amount and currency', () => {
      const money = Money.create(100, Currency.USD);
      expect(money).toBeInstanceOf(Money);
      expect(money.amount).toBe(100);
      expect(money.currency).toBe(Currency.USD);
    });

    it('should create with zero amount', () => {
      const money = Money.create(0, Currency.EUR);
      expect(money.amount).toBe(0);
      expect(money.currency).toBe(Currency.EUR);
    });

    it('should reject negative amount', () => {
      expect(() => Money.create(-1, Currency.USD)).toThrow(
        'Money amount cannot be negative',
      );
    });

    it('should reject NaN', () => {
      expect(() => Money.create(NaN, Currency.USD)).toThrow();
    });

    it('should reject Infinity', () => {
      expect(() => Money.create(Infinity, Currency.USD)).toThrow();
    });
  });

  describe('add()', () => {
    it('should sum amounts in same currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(50, Currency.USD);
      const result = a.add(b);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe(Currency.USD);
    });

    it('should throw on different currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(50, Currency.EUR);
      expect(() => a.add(b)).toThrow('different currencies');
    });
  });

  describe('subtract()', () => {
    it('should subtract amounts in same currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(30, Currency.USD);
      const result = a.subtract(b);
      expect(result.amount).toBe(70);
      expect(result.currency).toBe(Currency.USD);
    });

    it('should throw on different currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(30, Currency.EUR);
      expect(() => a.subtract(b)).toThrow('different currencies');
    });
  });

  describe('multiply()', () => {
    it('should multiply the amount', () => {
      const money = Money.create(50, Currency.EUR);
      const result = money.multiply(3);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe(Currency.EUR);
    });

    it('should work with fractional multiplier', () => {
      const money = Money.create(100, Currency.USD);
      const result = money.multiply(0.5);
      expect(result.amount).toBe(50);
    });
  });

  describe('equals()', () => {
    it('should compare by amount and currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(100, Currency.USD);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amount', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(200, Currency.USD);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different currency', () => {
      const a = Money.create(100, Currency.USD);
      const b = Money.create(100, Currency.EUR);
      expect(a.equals(b)).toBe(false);
    });
  });
});
