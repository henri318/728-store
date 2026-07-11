import { describe, expect, it } from 'vitest';
import { resolveCategoryDisplay } from '@/modules/products/domain/entities/category-translation';

describe('resolveCategoryDisplay', () => {
  const translations = [
    { locale: 'es' as const, name: 'Electrónica' },
    { locale: 'cat' as const, name: 'Electrònica' },
  ];

  it('prefers the active locale', () => {
    expect(resolveCategoryDisplay(translations, 'cat')?.name).toBe(
      'Electrònica',
    );
  });

  it('falls back to Spanish, then the first available translation', () => {
    expect(resolveCategoryDisplay([translations[0]], 'cat')?.name).toBe(
      'Electrónica',
    );
    expect(
      resolveCategoryDisplay([{ locale: 'cat', name: 'Electrònica' }], 'es')
        ?.name,
    ).toBe('Electrònica');
    expect(resolveCategoryDisplay([], 'es')).toBeNull();
  });
});
