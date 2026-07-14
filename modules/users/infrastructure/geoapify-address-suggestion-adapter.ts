import type { AddressSuggestionPort } from '../domain/ports/address-suggestion-port';
import type { UserAddressInput } from '../domain/user-address';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class GeoapifyAddressSuggestionAdapter implements AddressSuggestionPort {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async search(
    query: string,
    signal?: AbortSignal,
  ): Promise<UserAddressInput[]> {
    const normalized = query.trim();
    if (normalized.length < 3 || !this.apiKey) return [];
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.set('text', normalized);
    url.searchParams.set('filter', 'countrycode:es');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('lang', 'es');
    url.searchParams.set('limit', '5');
    url.searchParams.set('apiKey', this.apiKey);
    const response = await this.fetcher(url.href, { signal });
    if (!response.ok) throw new Error('Address provider unavailable');
    const body = (await response.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    return (body.features ?? []).map(({ properties = {} }) => ({
      street: stringValue(properties.street),
      houseNumber: stringValue(properties.housenumber),
      addressLine1: stringValue(properties.address_line1),
      addressLine2: stringValue(properties.address_line2),
      postalCode: stringValue(properties.postcode),
      city: stringValue(properties.city),
      county: stringValue(properties.county),
      state: stringValue(properties.state),
      country: stringValue(properties.country),
      countryCode: stringValue(properties.country_code)?.toUpperCase(),
      formattedAddress: stringValue(properties.formatted),
    }));
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
