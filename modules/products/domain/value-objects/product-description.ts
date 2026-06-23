/**
 * ProductDescription — a value object representing a product's description.
 *
 * Follows the project's VO pattern: private constructor, static create(),
 * readonly field, equals() by value.
 *
 * Rules:
 *  - Nullable: null input returns null (passthrough)
 *  - Non-null: max 2000 characters, trimmed
 */
export class ProductDescription {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string | null): ProductDescription | null {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();

    if (trimmed.length > 2000) {
      throw new Error('ProductDescription cannot exceed 2000 characters');
    }

    return new ProductDescription(trimmed);
  }

  equals(other: ProductDescription): boolean {
    return other instanceof ProductDescription && this.value === other.value;
  }
}
