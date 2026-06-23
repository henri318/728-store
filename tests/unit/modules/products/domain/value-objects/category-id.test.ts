import { describe, it, expect } from 'vitest';
import { CategoryId } from '@/modules/products/domain/value-objects/category-id';

describe('CategoryId', () => {
  describe('create()', () => {
    it('should return an instance with the provided value', () => {
      const id = CategoryId.create('cat-123');
      expect(id).toBeInstanceOf(CategoryId);
      expect(id.value).toBe('cat-123');
    });

    it('should throw on empty string', () => {
      expect(() => CategoryId.create('')).toThrow('EntityId cannot be empty');
    });

    it('should throw on whitespace-only string', () => {
      expect(() => CategoryId.create('   ')).toThrow(
        'EntityId cannot be empty',
      );
    });

    it('should trim whitespace from the value', () => {
      const id = CategoryId.create('  cat-456  ');
      expect(id.value).toBe('cat-456');
    });
  });

  describe('equals()', () => {
    it('should return true for the same value', () => {
      const a = CategoryId.create('cat-1');
      const b = CategoryId.create('cat-1');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = CategoryId.create('cat-1');
      const b = CategoryId.create('cat-2');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the value', () => {
      const id = CategoryId.create('cat-789');
      expect(id.toString()).toBe('cat-789');
    });
  });
});
