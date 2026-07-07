import { designPositionSchema } from '@/shared/validation/design-position-schema';
import { z } from 'zod';

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
