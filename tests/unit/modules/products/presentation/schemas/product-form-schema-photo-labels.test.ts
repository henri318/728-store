import { describe, expect, it } from 'vitest';
import { productTranslationInputSchema } from '@/modules/products/presentation/schemas/product-form-schema';

const base = { locale: 'es' as const, name: 'Producto' };

describe('photoLabels schema', () => {
  it('accepts optional empty labels and rejects labels over 200 characters', () => {
    expect(
      productTranslationInputSchema.safeParse({
        ...base,
        photoLabels: { 'img-1': '' },
      }).success,
    ).toBe(true);
    expect(
      productTranslationInputSchema.safeParse({
        ...base,
        photoLabels: { 'img-1': 'x'.repeat(201) },
      }).success,
    ).toBe(false);
  });

  it('rejects more than 50 photo labels', () => {
    const photoLabels = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [`img-${index}`, 'Label']),
    );
    expect(
      productTranslationInputSchema.safeParse({ ...base, photoLabels }).success,
    ).toBe(false);
  });
});
