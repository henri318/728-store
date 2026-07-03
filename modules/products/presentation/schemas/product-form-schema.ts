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

const designBlendModeSchema = z.enum([
  'source-over',
  'multiply',
  'overlay',
  'soft-light',
]);

export const designPositionInputSchema = z
  .object({
    imageUrl: z.string().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(10).max(200),
    rotation_deg: z.number().min(-45).max(45),
    opacity: z.number().min(0).max(100),
    blend_mode: designBlendModeSchema,
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
    designPosition: designPositionInputSchema.nullable().optional(),
  })
  .strict();

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
export type DesignPositionInput = z.infer<typeof designPositionInputSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
