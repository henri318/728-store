import { z } from 'zod';

export type CustomizationMode = 'description' | 'text' | 'photo' | 'text_photo';

export type CustomizationBlendMode =
  | 'source-over'
  | 'multiply'
  | 'overlay'
  | 'soft-light';

export const DEFAULT_PRODUCT_SIZE_OPTIONS = Object.freeze(['S', 'M', 'L']);

export const DEFAULT_DESIGN_BLEND_MODE: CustomizationBlendMode = 'multiply';
export const DEFAULT_DESIGN_SCALE_PERCENT = 100;
export const DEFAULT_DESIGN_OPACITY_PERCENT = 90;
export const DEFAULT_DESIGN_ROTATION_DEG = 0;

export const MIN_DESIGN_SCALE_PERCENT = 10;
export const MAX_DESIGN_SCALE_PERCENT = 200;
export const MIN_DESIGN_ROTATION_DEG = -45;
export const MAX_DESIGN_ROTATION_DEG = 45;
export const MIN_DESIGN_OPACITY_PERCENT = 0;
export const MAX_DESIGN_OPACITY_PERCENT = 100;

export interface PreviewOffset {
  [key: string]: unknown;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  maxWidth?: number;
}

/**
 * Buyer-side normalized design position.
 * Coordinates are normalized to the product image canvas (0..1 range).
 * `imageUrl` is the URL the user uploaded for their design.
 */
export interface DesignPosition {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: CustomizationBlendMode;
}

export interface ProductCustomizationConfigJson {
  [key: string]: unknown;
  mode: CustomizationMode;
  previewEnabled: boolean;
  previewTemplateUrl: string | null;
  sizeOptions: string[] | null;
  textOffset: PreviewOffset | null;
  imageOffset: PreviewOffset | null;
  /**
   * Whether the buyer can upload a custom design photo on the product page.
   * Independent from the legacy `mode` to keep the simplified form decoupled.
   */
  allowPhotoDesign?: boolean;
  /**
   * Free-form description of the design change/cambio — kept as a single
   * text field on the seller product form.
   */
  designChangeDescription?: string | null;
  /**
   * Category id used to tag the product. Stored in the JSON column so we
   * don't need a schema migration.
   */
  categoryId?: string | null;
  /**
   * Free-form tag names. Slugs are derived on the fly.
   */
  tagNames?: string[] | null;
  /**
   * Latest buyer-side design position captured by the mockup canvas.
   * Hidden from the UI — the cart/order layer reads it for fulfilment.
   */
  designPosition?: DesignPosition | null;
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
    scale: z
      .number()
      .min(MIN_DESIGN_SCALE_PERCENT)
      .max(MAX_DESIGN_SCALE_PERCENT),
    rotation_deg: z
      .number()
      .min(MIN_DESIGN_ROTATION_DEG)
      .max(MAX_DESIGN_ROTATION_DEG),
    opacity: z
      .number()
      .min(MIN_DESIGN_OPACITY_PERCENT)
      .max(MAX_DESIGN_OPACITY_PERCENT),
    blend_mode: designBlendModeSchema,
  })
  .strict();

const productCustomizationConfigSchema = z
  .object({
    mode: customizationModeSchema.optional(),
    previewEnabled: z.boolean().optional(),
    previewTemplateUrl: z.string().min(1).nullable().optional(),
    sizeOptions: z.array(z.string().min(1)).nullable().optional(),
    textOffset: previewOffsetSchema.nullable().optional(),
    imageOffset: previewOffsetSchema.nullable().optional(),
    allowPhotoDesign: z.boolean().optional(),
    designChangeDescription: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    tagNames: z.array(z.string().min(1)).nullable().optional(),
    designPosition: designPositionSchema.nullable().optional(),
  })
  .strict();

export class ProductCustomizationConfig {
  readonly mode: CustomizationMode;
  readonly previewEnabled: boolean;
  readonly previewTemplateUrl: string | null;
  readonly sizeOptions: string[] | null;
  readonly textOffset: PreviewOffset | null;
  readonly imageOffset: PreviewOffset | null;
  readonly allowPhotoDesign: boolean;
  readonly designChangeDescription: string | null;
  readonly categoryId: string | null;
  readonly tagNames: string[] | null;
  readonly designPosition: DesignPosition | null;

  private constructor(data: ProductCustomizationConfigJson) {
    this.mode = data.mode;
    this.previewEnabled = data.previewEnabled;
    this.previewTemplateUrl = data.previewTemplateUrl;
    this.sizeOptions = data.sizeOptions;
    this.textOffset = data.textOffset;
    this.imageOffset = data.imageOffset;
    this.allowPhotoDesign = data.allowPhotoDesign ?? false;
    this.designChangeDescription = data.designChangeDescription ?? null;
    this.categoryId = data.categoryId ?? null;
    this.tagNames = data.tagNames ?? null;
    this.designPosition = data.designPosition ?? null;
  }

  static default(): ProductCustomizationConfig {
    return new ProductCustomizationConfig({
      mode: 'description',
      previewEnabled: false,
      previewTemplateUrl: null,
      sizeOptions: null,
      textOffset: null,
      imageOffset: null,
      allowPhotoDesign: true,
      designChangeDescription: null,
      categoryId: null,
      tagNames: null,
      designPosition: null,
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
      sizeOptions: normalizeSizeOptions(data.sizeOptions ?? null),
      textOffset: data.textOffset ?? null,
      imageOffset: data.imageOffset ?? null,
      allowPhotoDesign: data.allowPhotoDesign ?? true,
      designChangeDescription: data.designChangeDescription ?? null,
      categoryId: data.categoryId ?? null,
      tagNames: normalizeTagNames(data.tagNames ?? null),
      designPosition: data.designPosition ?? null,
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

  getSizeOptions(
    defaultOptions: readonly string[] = DEFAULT_PRODUCT_SIZE_OPTIONS,
  ): readonly string[] {
    return this.sizeOptions && this.sizeOptions.length > 0
      ? this.sizeOptions
      : defaultOptions;
  }

  toJson(): ProductCustomizationConfigJson {
    return {
      mode: this.mode,
      previewEnabled: this.previewEnabled,
      previewTemplateUrl: this.previewTemplateUrl,
      sizeOptions: this.sizeOptions,
      textOffset: this.textOffset,
      imageOffset: this.imageOffset,
      allowPhotoDesign: this.allowPhotoDesign,
      designChangeDescription: this.designChangeDescription,
      categoryId: this.categoryId,
      tagNames: this.tagNames,
      designPosition: this.designPosition,
    };
  }
}

function normalizeSizeOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const options = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => entry.length > 0);

  return options.length > 0 ? options : null;
}

function normalizeTagNames(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const tags = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => entry.length > 0);

  return tags.length > 0 ? tags : null;
}
