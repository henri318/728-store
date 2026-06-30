import { z } from 'zod';
import { ProductStatus } from '../../domain/value-objects/product-status';

const previewOffsetSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    rotate: z.number().optional(),
    scale: z.number().optional(),
    maxWidth: z.number().optional(),
  })
  .strict();

export const productCustomizationConfigSchema = z
  .object({
    mode: z.enum(['description', 'text', 'photo', 'text_photo']),
    previewEnabled: z.boolean(),
    previewTemplateUrl: z.string().min(1).nullable(),
    textOffset: previewOffsetSchema.nullable(),
    imageOffset: previewOffsetSchema.nullable(),
  })
  .strict();

export const productFormSchema = z
  .object({
    locale: z.string().trim().min(1),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive(),
    status: z.nativeEnum(ProductStatus).optional(),
    customizationConfig: productCustomizationConfigSchema.optional(),
  })
  .strict();

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductCustomizationConfigInput = z.infer<
  typeof productCustomizationConfigSchema
>;
