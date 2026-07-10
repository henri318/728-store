import { describe, expect, it } from 'vitest';
import { CategorySlug } from '@/modules/products/domain/value-objects/category-slug';

describe('CategorySlug', () => {
  it('normalizes accents, casing, and punctuation into a URL-safe slug', () => {
    expect(CategorySlug.create('  Café con leche!  ').value).toBe(
      'cafe-con-leche',
    );
  });

  it('rejects empty or punctuation-only category names', () => {
    expect(() => CategorySlug.create(' '.repeat(3))).toThrow(
      'Category slug cannot be empty',
    );
    expect(() => CategorySlug.create('!!!')).toThrow(
      'Category slug cannot be empty',
    );
  });
});
