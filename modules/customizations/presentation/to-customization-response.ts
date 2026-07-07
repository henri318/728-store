import { customizationResponseSchema } from '@/modules/customizations/presentation/schemas/customization-schemas';

export function toCustomizationResponse(customization: {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  designPosition: unknown;
  createdAt: Date;
}) {
  return customizationResponseSchema.parse({
    id: customization.id,
    productId: customization.productId,
    text: customization.text,
    color: customization.color,
    size: customization.size,
    imageUrl: customization.imageUrl,
    designPosition:
      (customization.designPosition as
        | {
            imageUrl: string;
            x: number;
            y: number;
            scale: number;
            rotation_deg: number;
            opacity: number;
            blend_mode: string;
          }
        | null
        | undefined) ?? null,
    createdAt: customization.createdAt.toISOString(),
  });
}
