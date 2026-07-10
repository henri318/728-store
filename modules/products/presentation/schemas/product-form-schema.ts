import { z } from 'zod';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import {
  ALLOWED_MIME_BY_PURPOSE,
  ProductImagePurpose,
} from '@/modules/products/domain/value-objects/product-image-purpose';

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
    purpose: z.nativeEnum(ProductImagePurpose).optional(),
    mimeType: z.string().trim().min(1).optional(),
    posterUrl: z.string().trim().url().nullable().optional(),
  })
  .strict()
  .superRefine((image, ctx) => {
    if (
      image.purpose !== undefined &&
      image.mimeType !== undefined &&
      !ALLOWED_MIME_BY_PURPOSE[image.purpose].includes(
        image.mimeType.toLowerCase(),
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: `MIME type ${image.mimeType} not allowed for purpose ${image.purpose}`,
      });
    }
  });

export const productFormSchema = z
  .object({
    locale: z.enum(['es', 'cat']).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive(),
    translation: productTranslationSchema.optional(),
    translations: z.array(productTranslationInputSchema).min(1).optional(),
    customizationConfig: productCustomizationConfigSchema.optional(),
    images: z.array(productImageSchema).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
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
