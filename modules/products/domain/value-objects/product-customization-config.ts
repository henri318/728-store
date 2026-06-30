import { z } from 'zod';

export type CustomizationMode = 'description' | 'text' | 'photo' | 'text_photo';

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
  })
  .strict();

export class ProductCustomizationConfig {
  readonly mode: CustomizationMode;
  readonly previewEnabled: boolean;
  readonly previewTemplateUrl: string | null;
  readonly textOffset: PreviewOffset | null;
  readonly imageOffset: PreviewOffset | null;

  private constructor(data: ProductCustomizationConfigJson) {
    this.mode = data.mode;
    this.previewEnabled = data.previewEnabled;
    this.previewTemplateUrl = data.previewTemplateUrl;
    this.textOffset = data.textOffset;
    this.imageOffset = data.imageOffset;
  }

  static default(): ProductCustomizationConfig {
    return new ProductCustomizationConfig({
      mode: 'description',
      previewEnabled: false,
      previewTemplateUrl: null,
      textOffset: null,
      imageOffset: null,
    });
  }

  static fromJson(value: unknown): ProductCustomizationConfig {
    const parsed = productCustomizationConfigSchema.safeParse(value);
    if (!parsed.success) {
      return ProductCustomizationConfig.default();
    }

    const data = parsed.data;
    return new ProductCustomizationConfig({
      mode: data.mode ?? 'description',
      previewEnabled: data.previewEnabled ?? false,
      previewTemplateUrl: data.previewTemplateUrl ?? null,
      textOffset: data.textOffset ?? null,
      imageOffset: data.imageOffset ?? null,
    });
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

  toJson(): ProductCustomizationConfigJson {
    return {
      mode: this.mode,
      previewEnabled: this.previewEnabled,
      previewTemplateUrl: this.previewTemplateUrl,
      textOffset: this.textOffset,
      imageOffset: this.imageOffset,
    };
  }
}
