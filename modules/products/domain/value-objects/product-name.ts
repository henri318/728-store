/**
 * ProductName — a value object representing a product's display name.
 *
 * Follows the project's VO pattern: private constructor, static create(),
 * readonly field, equals() by value.
 *
 * Rules:
 *  - Non-empty after trim (1–200 chars)
 *  - Input is trimmed before validation
 */
export class ProductName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): ProductName {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('ProductName cannot be empty');
    }

    if (trimmed.length > 200) {
      throw new Error('ProductName cannot exceed 200 characters');
    }

    return new ProductName(trimmed);
  }

  equals(other: ProductName): boolean {
    return other instanceof ProductName && this.value === other.value;
  }
}
