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

export const productTranslationInputSchema = z
  .object({
    locale: z.enum(['es', 'cat']),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1)).max(20).default([]),
    sizes: z.array(z.string().trim().min(1)).max(20).default([]),
    designChangeDescription: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const productTranslationSchema = z
  .object({
    tags: z.array(z.string().min(1)).max(20).nullable().optional(),
    sizes: z.array(z.string().min(1)).nullable().optional(),
    designChangeDescription: z.string().max(2000).nullable().optional(),
  })
  .strip();

export const productCustomizationConfigSchema = z
  .object({
    mode: z.enum(['description', 'text', 'photo', 'text_photo']),
    previewEnabled: z.boolean(),
    previewTemplateUrl: z.string().min(1).nullable(),
    textOffset: previewOffsetSchema.nullable(),
    imageOffset: previewOffsetSchema.nullable(),
    allowPhotoDesign: z.boolean().optional(),
    categoryId: z.string().nullable().optional(),
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
    locale: z.enum(['es', 'cat']).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive(),
    translation: productTranslationSchema.optional(),
    translations: z.array(productTranslationInputSchema).min(1).optional(),
    customizationConfig: productCustomizationConfigSchema.optional(),
    images: z.array(productImageSchema).optional().default([]),
    status: z.string().optional(),
  })
  .strict();

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductTranslationInput = z.infer<
  typeof productTranslationInputSchema
>;
export type ProductCustomizationConfigInput = z.infer<
  typeof productCustomizationConfigSchema
>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
