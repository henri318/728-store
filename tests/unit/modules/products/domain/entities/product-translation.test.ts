import { describe, expect, it } from 'vitest';
import { resolvePhotoLabel } from '@/modules/products/domain/entities/product-translation';

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
