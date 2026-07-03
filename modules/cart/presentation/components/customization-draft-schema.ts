import { z } from 'zod';

const designBlendModeSchema = z.enum([
  'source-over',
  'multiply',
  'overlay',
  'soft-light',
]);

export const designPositionSchema = z
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

export const customizationDraftSchema = z
  .object({
    text: z.string().max(500).nullable().optional(),
    color: z.string().max(50).nullable().optional(),
    size: z.string().max(50).nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    imageUploadId: z.string().nullable().optional(),
    designPosition: designPositionSchema.nullable().optional(),
  })
  .strict();

export type DesignPositionPayload = z.infer<typeof designPositionSchema>;
export type CustomizationDraftPayload = z.infer<
  typeof customizationDraftSchema
>;

export function normalizeCustomizationDraft(
  customization: Partial<CustomizationDraftPayload> | null | undefined,
): CustomizationDraftPayload {
  return {
    text: customization?.text?.trim() ? customization.text.trim() : null,
    color: customization?.color?.trim() ? customization.color.trim() : null,
    size: customization?.size?.trim() ? customization.size.trim() : null,
    imageUrl: customization?.imageUrl?.trim()
      ? customization.imageUrl.trim()
      : null,
    imageUploadId: customization?.imageUploadId?.trim()
      ? customization.imageUploadId.trim()
      : null,
    designPosition: customization?.designPosition ?? null,
  };
}
