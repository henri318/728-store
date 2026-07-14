import { z } from 'zod';

export type CustomizationMode = 'description' | 'text' | 'photo' | 'text_photo';

export const DEFAULT_PRODUCT_SIZE_OPTIONS = Object.freeze(['S', 'M', 'L']);

export type DesignBlendMode =
  'source-over' | 'multiply' | 'overlay' | 'soft-light';

export const DEFAULT_DESIGN_BLEND_MODE: DesignBlendMode = 'source-over';
export const DEFAULT_DESIGN_OPACITY_PERCENT = 100;
export const DEFAULT_DESIGN_ROTATION_DEG = 0;
export const DEFAULT_DESIGN_SCALE_PERCENT = 100;
export const MAX_DESIGN_OPACITY_PERCENT = 100;
export const MAX_DESIGN_ROTATION_DEG = 360;
export const MAX_DESIGN_SCALE_PERCENT = 200;
export const MIN_DESIGN_OPACITY_PERCENT = 0;
export const MIN_DESIGN_ROTATION_DEG = -360;
export const MIN_DESIGN_SCALE_PERCENT = 10;

export interface DesignPosition {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: DesignBlendMode;
}

export interface PreviewOffset {
  [key: string]: unknown;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  maxWidth?: number;
}

export interface ProductCustomizationConfigJson {
  [key: string]: unknown;
  mode: CustomizationMode;
  previewEnabled: boolean;
  previewTemplateUrl: string | null;
  textOffset: PreviewOffset | null;
  imageOffset: PreviewOffset | null;
  categoryId?: string | null;
}

const customizationModeSchema = z.enum([
  'description',
  'text',
  'photo',
  'text_photo',
]);

const previewOffsetSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    rotate: z.number().optional(),
    scale: z.number().optional(),
    maxWidth: z.number().optional(),
  })
  .strict();

const productCustomizationConfigSchema = z
  .object({
    mode: customizationModeSchema.optional(),
    previewEnabled: z.boolean().optional(),
    previewTemplateUrl: z.string().min(1).nullable().optional(),
    textOffset: previewOffsetSchema.nullable().optional(),
    imageOffset: previewOffsetSchema.nullable().optional(),
    categoryId: z.string().nullable().optional(),
  })
  .strip();

export class ProductCustomizationConfig {
  static default(): ProductCustomizationConfig {
    return new ProductCustomizationConfig({
      mode: 'description',
      previewEnabled: false,
      previewTemplateUrl: null,
      textOffset: null,
      imageOffset: null,
      categoryId: null,
    });
  }

  static fromJson(value: unknown): ProductCustomizationConfig {
    const parsed = productCustomizationConfigSchema.safeParse(value);
    if (!parsed.success) {
      return this.default();
    }

    const data = parsed.data as Record<string, unknown>;
    const raw = value as Record<string, unknown> | null;

    // Backward compat: stored JSON may have allowPhotoDesign: true with
    // mode: 'description' from before the flag was removed.
    const mode: CustomizationMode =
      (data.mode as CustomizationMode) ?? 'description';
    const effectiveMode: CustomizationMode =
      mode === 'description' &&
      (raw?.allowPhotoDesign as boolean | undefined) === true
        ? 'text_photo'
        : mode;

    return new ProductCustomizationConfig({
      mode: effectiveMode,
      previewEnabled: (data.previewEnabled as boolean) ?? false,
      previewTemplateUrl: (data.previewTemplateUrl as string | null) ?? null,
      textOffset: (data.textOffset as PreviewOffset | null) ?? null,
      imageOffset: (data.imageOffset as PreviewOffset | null) ?? null,
      categoryId: (data.categoryId as string | null) ?? null,
    });
  }

  readonly mode: CustomizationMode;
  readonly previewEnabled: boolean;
  readonly previewTemplateUrl: string | null;
  readonly textOffset: PreviewOffset | null;
  readonly imageOffset: PreviewOffset | null;
  readonly categoryId: string | null;

  private constructor(data: ProductCustomizationConfigJson) {
    this.mode = data.mode;
    this.previewEnabled = data.previewEnabled;
    this.previewTemplateUrl = data.previewTemplateUrl;
    this.textOffset = data.textOffset;
    this.imageOffset = data.imageOffset;
    this.categoryId = data.categoryId ?? null;
  }

  isDefault(): boolean {
    return (
      JSON.stringify(this.toJson()) ===
      JSON.stringify(ProductCustomizationConfig.default().toJson())
    );
  }

  isPreviewCapable(): boolean {
    return (
      this.previewEnabled &&
      this.mode !== 'description' &&
      this.previewTemplateUrl !== null
    );
  }

  allowsText(): boolean {
    return this.mode !== 'photo';
  }

  allowsPhoto(): boolean {
    return this.mode === 'photo' || this.mode === 'text_photo';
  }

  allowsStyleOptions(): boolean {
    return this.mode === 'text' || this.mode === 'text_photo';
  }

  getSizeOptions(
    defaultOptions: readonly string[] = DEFAULT_PRODUCT_SIZE_OPTIONS,
  ): readonly string[] {
    return defaultOptions;
  }

  toJson(): ProductCustomizationConfigJson {
    return {
      mode: this.mode,
      previewEnabled: this.previewEnabled,
      previewTemplateUrl: this.previewTemplateUrl,
      textOffset: this.textOffset,
      imageOffset: this.imageOffset,
      categoryId: this.categoryId,
    };
  }
}
