import { describe, expect, it, vi } from 'vitest';
import { GeoapifyAddressSuggestionAdapter } from '@/modules/users/infrastructure/geoapify-address-suggestion-adapter';

describe('GeoapifyAddressSuggestionAdapter', () => {
  it('does not call the provider for short queries and strips provider metadata', async () => {
    const fetcher = vi.fn();
    const adapter = new GeoapifyAddressSuggestionAdapter('secret', fetcher);
    expect(await adapter.search('Ma')).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requests Spain and returns normalized delivery fields only', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              street: 'Calle Mayor',
              housenumber: '1',
              postcode: '28013',
              city: 'Madrid',
              county: 'Madrid',
              state: 'Madrid',
              country: 'Spain',
              country_code: 'es',
              formatted: 'Calle Mayor 1',
              place_id: 'must-not-leak',
              lat: 40,
              lon: -3,
            },
          },
        ],
      }),
    });
    const adapter = new GeoapifyAddressSuggestionAdapter('secret', fetcher);
    const result = await adapter.search('Mayor');
    expect(fetcher.mock.calls[0][0]).toContain('filter=countrycode%3Aes');
    expect(result[0]).toEqual(
      expect.objectContaining({
        street: 'Calle Mayor',
        houseNumber: '1',
        countryCode: 'ES',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('place_id');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
