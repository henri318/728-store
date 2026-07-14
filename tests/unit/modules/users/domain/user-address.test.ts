import { describe, expect, it } from 'vitest';
import {
  isCompleteSpanishDeliveryAddress,
  userAddressSchema,
} from '@/modules/users/domain/user-address';

describe('userAddressSchema', () => {
  it('accepts partial editable addresses', () => {
    expect(userAddressSchema.safeParse({ city: 'Madrid' }).success).toBe(true);
  });

  it('requires every delivery field and ES at checkout', () => {
    const address = {
      street: 'Mayor',
      houseNumber: '1',
      postalCode: '28013',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES',
    };
    expect(isCompleteSpanishDeliveryAddress(address)).toBe(true);
    expect(
      isCompleteSpanishDeliveryAddress({ ...address, postalCode: '' }),
    ).toBe(false);
    expect(
      isCompleteSpanishDeliveryAddress({ ...address, countryCode: 'FR' }),
    ).toBe(false);
  });
});
