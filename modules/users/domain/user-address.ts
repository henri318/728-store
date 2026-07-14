import { z } from 'zod';

export const userAddressFields = {
  street: z.string().trim().optional().nullable(),
  houseNumber: z.string().trim().optional().nullable(),
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  county: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  countryCode: z.string().trim().toUpperCase().optional().nullable(),
  formattedAddress: z.string().trim().optional().nullable(),
  floor: z.string().trim().optional().nullable(),
  door: z.string().trim().optional().nullable(),
  stairway: z.string().trim().optional().nullable(),
  block: z.string().trim().optional().nullable(),
  instructions: z.string().trim().optional().nullable(),
};

export const userAddressSchema = z.object(userAddressFields);
export type UserAddressInput = z.infer<typeof userAddressSchema>;

export const checkoutEligibilitySchema = userAddressSchema.superRefine(
  (address, ctx) => {
    for (const field of [
      'street',
      'houseNumber',
      'postalCode',
      'city',
      'country',
      'countryCode',
    ] as const) {
      if (!address[field])
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Delivery address is required',
        }); // eslint-disable-line unicorn/no-computed-property-existence-check
    }
    if (address.countryCode !== 'ES')
      ctx.addIssue({
        code: 'custom',
        path: ['countryCode'],
        message: 'Delivery is available only in Spain',
      });
  },
);

export type CompleteDeliveryAddress = z.infer<typeof checkoutEligibilitySchema>;

export function isCompleteSpanishDeliveryAddress(
  value: unknown,
): value is CompleteDeliveryAddress {
  return checkoutEligibilitySchema.safeParse(value).success;
}
