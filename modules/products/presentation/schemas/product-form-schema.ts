import { z } from 'zod';

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
    sizeOptions: z.array(z.string().min(1)).nullable().optional(),
    textOffset: previewOffsetSchema.nullable(),
    imageOffset: previewOffsetSchema.nullable(),
    allowPhotoDesign: z.boolean().optional(),
    designChangeDescription: z.string().max(2000).nullable().optional(),
    categoryId: z.string().nullable().optional(),
    tagNames: z.array(z.string().min(1)).max(20).nullable().optional(),
  })
  .strip();

export const productImageSchema = z
  .object({
    url: z.string().trim().min(1),
    alt: z.string().trim().min(1),
    position: z.number().int().nonnegative(),
  })
  .strict();

export const productFormSchema = z
  .object({
    locale: z.string().trim().min(1),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive(),
    customizationConfig: productCustomizationConfigSchema.optional(),
    images: z.array(productImageSchema).optional().default([]),
    status: z.string().optional(),
  })
  .strict();

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductCustomizationConfigInput = z.infer<
  typeof productCustomizationConfigSchema
>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
