import { describe, it, expect, vi } from 'vitest';
import { getDictionary } from '@/shared/i18n/get-dictionary';

vi.mock('server-only', () => ({}));

describe('i18n getDictionary', () => {
  it('should load the Spanish dictionary', async () => {
    const dict = await getDictionary('es');
    expect(dict).toHaveProperty('common');
    expect(dict).toHaveProperty('sellerDashboard');
    expect(dict.common).toBeTypeOf('object');
    expect(dict.sellerDashboard).toBeTypeOf('object');
  });

  it('should load the Catalan dictionary', async () => {
    const dict = await getDictionary('cat');
    expect(dict).toHaveProperty('common');
    expect(dict).toHaveProperty('sellerDashboard');
    expect(dict.common).toBeTypeOf('object');
    expect(dict.sellerDashboard).toBeTypeOf('object');
  });

  it('should fallback to Spanish for an unknown locale', async () => {
    // @ts-expect-error - testing invalid input
    const dict = await getDictionary('fr');
    expect(dict).toHaveProperty('common');
    expect(dict.common).toBeTypeOf('object');
  });
});
