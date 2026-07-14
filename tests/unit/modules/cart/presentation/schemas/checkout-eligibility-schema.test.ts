import { describe, expect, it } from 'vitest';
import { checkoutEligibilitySchema } from '@/modules/cart/presentation/schemas/checkout-eligibility-schema';

describe('checkoutEligibilitySchema', () => {
  const valid = {
    street: 'Mayor',
    houseNumber: '1',
    postalCode: '28013',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
  };
  it('accepts a complete Spanish address', () =>
    expect(checkoutEligibilitySchema.safeParse(valid).success).toBe(true));
  it('rejects non-Spain and incomplete delivery addresses', () => {
    expect(
      checkoutEligibilitySchema.safeParse({ ...valid, countryCode: 'FR' })
        .success,
    ).toBe(false);
    expect(
      checkoutEligibilitySchema.safeParse({ ...valid, postalCode: '' }).success,
    ).toBe(false);
  });
});
