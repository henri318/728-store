import { describe, expect, it } from 'vitest';
import { createCategorySchema } from '@/modules/products/presentation/schemas/category-schemas';

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
