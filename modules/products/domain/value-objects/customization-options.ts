export class CustomizationOptions {
  readonly text?: string;
  readonly color?: string;
  readonly size?: string;
  readonly imageUrl?: string;

  private constructor(data: {
    text?: string;
    color?: string;
    size?: string;
    imageUrl?: string;
  }) {
    this.text = data.text;
    this.color = data.color;
    this.size = data.size;
    this.imageUrl = data.imageUrl;
  }

  static create(data: {
    text?: string | null;
    color?: string | null;
    size?: string | null;
    imageUrl?: string | null;
  }): CustomizationOptions {
    // Normalize null to undefined — DB fields return string | null.
    const text = data.text ?? undefined;
    const color = data.color ?? undefined;
    const size = data.size ?? undefined;
    const imageUrl = data.imageUrl ?? undefined;

    if (text !== undefined) {
      if (text.length > 500) {
        throw new Error('Customization text must be at most 500 characters');
      }
    }

    if (color !== undefined && color.trim().length === 0) {
      throw new Error('Customization color cannot be empty if provided');
    }

    if (size !== undefined && size.trim().length === 0) {
      throw new Error('Customization size cannot be empty if provided');
    }

    if (imageUrl !== undefined) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(imageUrl)) {
        throw new Error('Customization image URL must be a valid URL');
      }
    }

    return new CustomizationOptions({ text, color, size, imageUrl });
  }

  equals(other: CustomizationOptions): boolean {
    return (
      other instanceof CustomizationOptions &&
      this.text === other.text &&
      this.color === other.color &&
      this.size === other.size &&
      this.imageUrl === other.imageUrl
    );
  }
}
