/**
 * CustomizationOptions — value object for customization field validation.
 *
 * Validation rules:
 *  - text: max 500 chars
 *  - color: non-empty if present, max 50 chars
 *  - size: non-empty if present, max 50 chars
 *  - imageUrl: must match ^https?://.+
 *
 * `designPosition` is shape-validated upstream by the zod schema in the
 * presentation layer. Here we only enforce "if present, must be an object
 * with a non-empty imageUrl" so the persistence layer never receives a
 * malformed payload.
 *
 * Moved from products module (byte-for-byte copy + 50-char limits for
 * color/size per spec REQ-CUST-01).
 */
export interface CustomizationDesignPosition {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}

export class CustomizationOptions {
  readonly text?: string;
  readonly color?: string;
  readonly size?: string;
  readonly imageUrl?: string;
  readonly designPosition?: CustomizationDesignPosition | null;

  private constructor(data: {
    text?: string;
    color?: string;
    size?: string;
    imageUrl?: string;
    designPosition?: CustomizationDesignPosition | null;
  }) {
    this.text = data.text;
    this.color = data.color;
    this.size = data.size;
    this.imageUrl = data.imageUrl;
    this.designPosition = data.designPosition;
  }

  static create(data: {
    text?: string | null;
    color?: string | null;
    size?: string | null;
    imageUrl?: string | null;
    designPosition?: CustomizationDesignPosition | null;
  }): CustomizationOptions {
    // Normalize null to undefined — DB fields return string | null.
    const text = data.text ?? undefined;

    if (text !== undefined && text.length > 500) {
      throw new Error('Customization text must be at most 500 characters');
    }

    const color = data.color ?? undefined;
    const size = data.size ?? undefined;
    const imageUrl = data.imageUrl ?? undefined;

    if (color !== undefined) {
      if (color.trim().length === 0) {
        throw new Error('Customization color cannot be empty if provided');
      }
      if (color.length > 50) {
        throw new Error('Customization color must be at most 50 characters');
      }
    }

    if (size !== undefined) {
      if (size.trim().length === 0) {
        throw new Error('Customization size cannot be empty if provided');
      }
      if (size.length > 50) {
        throw new Error('Customization size must be at most 50 characters');
      }
    }

    if (imageUrl !== undefined) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(imageUrl)) {
        throw new Error('Customization image URL must be a valid URL');
      }
    }

    const designPosition = data.designPosition ?? undefined;

    if (
      designPosition !== undefined &&
      designPosition !== null &&
      (typeof designPosition !== 'object' ||
        typeof designPosition.imageUrl !== 'string' ||
        designPosition.imageUrl.length === 0)
    ) {
      throw new Error(
        'Customization designPosition must be an object with a non-empty imageUrl',
      );
    }

    return new CustomizationOptions({
      text,
      color,
      size,
      imageUrl,
      designPosition: designPosition ?? null,
    });
  }

  equals(other: CustomizationOptions): boolean {
    return (
      other instanceof CustomizationOptions &&
      this.text === other.text &&
      this.color === other.color &&
      this.size === other.size &&
      this.imageUrl === other.imageUrl &&
      designPositionEquals(this.designPosition, other.designPosition)
    );
  }
}

function designPositionEquals(
  a: CustomizationDesignPosition | null | undefined,
  b: CustomizationDesignPosition | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
