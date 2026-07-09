import { describe, expect, it } from 'vitest';
import { resolveDisplay } from '@/modules/products/domain/entities/product-translation';

describe('resolveDisplay', () => {
  it('returns the requested locale when it exists', () => {
    const translations = [
      {
        locale: 'es',
        name: 'Camiseta',
        description: 'Una camiseta',
        tags: ['ropa'],
        sizes: ['S', 'M'],
        designChangeDescription: 'Base',
      },
      {
        locale: 'cat',
        name: 'Samarreta',
        description: 'Una samarreta',
        tags: ['roba'],
        sizes: ['M', 'L'],
        designChangeDescription: 'Canvi base',
      },
    ] as const;

    const result = resolveDisplay(translations, 'cat');

    expect(result).toMatchObject({
      locale: 'cat',
      name: 'Samarreta',
      description: 'Una samarreta',
      tags: ['roba'],
      sizes: ['M', 'L'],
      designChangeDescription: 'Canvi base',
    });
  });

  it('falls back to es when the requested locale is missing', () => {
    const translations = [
      {
        locale: 'es',
        name: 'Camiseta',
        description: 'Una camiseta',
        tags: ['ropa'],
        sizes: ['S'],
        designChangeDescription: null,
      },
      {
        locale: 'cat',
        name: 'Samarreta',
        description: 'Una samarreta',
        tags: ['roba'],
        sizes: ['M'],
        designChangeDescription: 'Canvi base',
      },
    ] as const;

    const result = resolveDisplay(translations, 'fr');

    expect(result).toMatchObject({
      locale: 'es',
      name: 'Camiseta',
      tags: ['ropa'],
      sizes: ['S'],
      designChangeDescription: null,
    });
  });

  it('falls back to the first available translation when es is missing', () => {
    const translations = [
      {
        locale: 'cat',
        name: 'Samarreta',
        description: 'Una samarreta',
        tags: ['roba'],
        sizes: ['M', 'L'],
        designChangeDescription: 'Canvi base',
      },
      {
        locale: 'fr',
        name: 'T-shirt',
        description: 'Un t-shirt',
        tags: ['vetement'],
        sizes: ['XL'],
        designChangeDescription: null,
      },
    ] as const;

    const result = resolveDisplay(translations, 'es');

    expect(result).toMatchObject({
      locale: 'cat',
      name: 'Samarreta',
      sizes: ['M', 'L'],
      designChangeDescription: 'Canvi base',
    });
  });

  it('returns null when there are no translations', () => {
    expect(resolveDisplay([], 'es')).toBeNull();
  });
});
