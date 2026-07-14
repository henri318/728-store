import es from '@/shared/i18n/locales/es.json';
import cat from '@/shared/i18n/locales/cat.json';
import { describe, expect, it } from 'vitest';

const keys = [
  'street',
  'houseNumber',
  'postalCode',
  'city',
  'floor',
  'door',
  'instructions',
  'countryLabel',
  'searchPlaceholder',
  'noResults',
  'retry',
  'providerError',
  'listboxLabel',
  'composedLabel',
] as const;

describe('address dictionaries', () => {
  it.each([
    ['es', es.auth],
    ['cat', cat.auth],
  ])(
    'contains every visible and ARIA address key for %s',
    (_locale, address) => {
      for (const key of keys) expect(address[key]).toEqual(expect.any(String));
      expect(address).not.toHaveProperty('countryCode');
      expect(address).not.toHaveProperty('formattedAddress');
    },
  );
});
