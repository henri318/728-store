import { z } from 'zod';

const customizationFieldsSchema = z.object({
  text: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .max(50)
    .refine((value) => value.trim().length > 0, {
      message: 'Customization color cannot be empty if provided',
    })
    .nullable()
    .optional(),
  size: z
    .string()
    .max(50)
    .refine((value) => value.trim().length > 0, {
      message: 'Customization size cannot be empty if provided',
    })
    .nullable()
    .optional(),
  imageUrl: z
    .string()
    .regex(/^https?:\/\/.+/, 'Image URL must start with http:// or https://')
    .nullable()
    .optional(),
});

export const createCustomizationSchema = customizationFieldsSchema
  .extend({
    productId: z.string().min(1, 'Product ID is required'),
  })
  .strict();

export const updateCustomizationSchema = customizationFieldsSchema
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one customization field is required',
  });

export const customizationResponseSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  text: z.string().nullable(),
  color: z.string().nullable(),
  size: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const customizationListResponseSchema = z.object({
  items: z.array(customizationResponseSchema),
});

export type CreateCustomizationInput = z.infer<
  typeof createCustomizationSchema
>;
export type UpdateCustomizationInput = z.infer<
  typeof updateCustomizationSchema
>;
export type CustomizationResponse = z.infer<typeof customizationResponseSchema>;
