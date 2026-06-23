import { describe, it, expect } from 'vitest';
import { ProductName } from '@/modules/products/domain/value-objects/product-name';

describe('ProductName', () => {
  describe('create()', () => {
    it('should create with valid name', () => {
      const name = ProductName.create('Wireless Headphones');
      expect(name).toBeInstanceOf(ProductName);
      expect(name.value).toBe('Wireless Headphones');
    });

    it('should trim whitespace from the value', () => {
      const name = ProductName.create('  Taza de café  ');
      expect(name.value).toBe('Taza de café');
    });

    it('should create with exactly 1 character', () => {
      const name = ProductName.create('A');
      expect(name.value).toBe('A');
    });

    it('should create with exactly 200 characters', () => {
      const value = 'A'.repeat(200);
      const name = ProductName.create(value);
      expect(name.value).toBe(value);
    });

    it('should reject empty string', () => {
      expect(() => ProductName.create('')).toThrow(
        'ProductName cannot be empty',
      );
    });

    it('should reject whitespace-only string', () => {
      expect(() => ProductName.create('   ')).toThrow(
        'ProductName cannot be empty',
      );
    });

    it('should reject string longer than 200 characters', () => {
      const value = 'A'.repeat(201);
      expect(() => ProductName.create(value)).toThrow(
        'ProductName cannot exceed 200 characters',
      );
    });
  });

  describe('equals()', () => {
    it('should return true for the same value', () => {
      const a = ProductName.create('Taza');
      const b = ProductName.create('Taza');
      expect(a.equals(b)).toBe(true);
    });

    it('should return true after trimming', () => {
      const a = ProductName.create('Taza');
      const b = ProductName.create('  Taza  ');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = ProductName.create('Taza');
      const b = ProductName.create('Tazón');
      expect(a.equals(b)).toBe(false);
    });
  });
});
