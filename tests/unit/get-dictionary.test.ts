import { describe, it, expect, vi } from 'vitest';
import { getDictionary } from '@/shared/i18n/get-dictionary';

// Mock server-only since it's a Next.js built-in that doesn't exist in Vitest
vi.mock('server-only', () => ({}));

describe('i18n getDictionary', () => {
  it('should load the Spanish dictionary', async () => {
    const dict = await getDictionary('es');
    expect(dict.common.home).toBe('Inicio');
    expect(dict.common.products).toBe('Nuestros Productos');
  });

  it('should load the Catalan dictionary', async () => {
    const dict = await getDictionary('cat');
    expect(dict.common.home).toBe('Inici');
    expect(dict.common.products).toBe('Els Nostres Productes');
  });

  it('should fallback to Spanish for an unknown locale', async () => {
    // @ts-ignore - testing invalid input
    const dict = await getDictionary('fr');
    expect(dict.common.home).toBe('Inicio');
  });
});
