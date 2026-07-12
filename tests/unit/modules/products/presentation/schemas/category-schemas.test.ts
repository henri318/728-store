import { describe, expect, it } from 'vitest';
import {
  createCategorySchema,
  updateCategorySchema,
} from '@/modules/products/presentation/schemas/category-schemas';

describe('createCategorySchema', () => {
  it('accepts both trimmed bilingual labels', () => {
    expect(
      createCategorySchema.parse({ nameEs: ' Ropa ', nameCat: ' Roba ' }),
    ).toEqual({ nameEs: 'Ropa', nameCat: 'Roba' });
  });

  it('rejects missing, empty, and extra fields', () => {
    expect(createCategorySchema.safeParse({ nameEs: 'Ropa' }).success).toBe(
      false,
    );
    expect(
      createCategorySchema.safeParse({ nameEs: ' ', nameCat: 'Roba' }).success,
    ).toBe(false);
    expect(
      createCategorySchema.safeParse({
        nameEs: 'Ropa',
        nameCat: 'Roba',
        name: 'legacy',
      }).success,
    ).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  it('accepts trimmed bilingual labels', () => {
    expect(
      updateCategorySchema.parse({ nameEs: ' Ropa ', nameCat: ' Roba ' }),
    ).toEqual({ nameEs: 'Ropa', nameCat: 'Roba' });
  });

  it('rejects incomplete names and unknown fields', () => {
    expect(updateCategorySchema.safeParse({ nameEs: 'Ropa' }).success).toBe(
      false,
    );
    expect(
      updateCategorySchema.safeParse({
        nameEs: 'Ropa',
        nameCat: 'Roba',
        slug: 'legacy',
      }).success,
    ).toBe(false);
  });
});
