import { describe, expect, it } from 'vitest';
import {
  resolveDisplay,
  resolvePhotoLabel,
} from '@/modules/products/domain/entities/product-translation';

describe('resolveDisplay', () => {
  it('returns the requested locale when it exists', () => {
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
        locale: 'es',
        name: 'Camiseta',
        description: 'Una camiseta',
        tags: ['ropa'],
        sizes: ['S', 'M'],
        designChangeDescription: 'Base',
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
        locale: 'cat',
        name: 'Samarreta',
        description: 'Una samarreta',
        tags: ['roba'],
        sizes: ['M'],
        designChangeDescription: 'Canvi base',
      },
      {
        locale: 'es',
        name: 'Camiseta',
        description: 'Una camiseta',
        tags: ['ropa'],
        sizes: ['S'],
        designChangeDescription: null,
      },
    ] as const;

    const result = resolveDisplay(translations, 'fr');

    expect(result).toMatchObject({
      locale: 'es',
      name: 'Camiseta',
      description: 'Una camiseta',
      tags: ['ropa'],
      sizes: ['S'],
      designChangeDescription: null,
    });
  });

  it('returns null when no translations exist', () => {
    expect(resolveDisplay([], 'cat')).toBeNull();
  });
});

describe('resolvePhotoLabel', () => {
  const translations = [
    {
      locale: 'es',
      name: 'Producto',
      description: null,
      photoLabels: { 'img-1': 'Frontal' },
    },
    {
      locale: 'cat',
      name: 'Producte',
      description: null,
      photoLabels: { 'img-1': 'Davant' },
    },
  ];

  it('uses the active locale before neutral es', () => {
    expect(resolvePhotoLabel(translations, 'img-1', 'cat')).toBe('Davant');
  });

  it('falls back to es and then an empty label', () => {
    expect(resolvePhotoLabel(translations, 'img-1', 'fr')).toBe('Frontal');
    expect(resolvePhotoLabel(translations, 'missing', 'cat')).toBe('');
  });
});
