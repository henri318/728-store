import { normalizeText } from '@/shared/lib/normalize-text';

export class CategorySlug {
  static create(value: string): CategorySlug {
    const normalized = normalizeText(value.trim().toLowerCase())
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .join('-');

    if (!normalized) {
      throw new Error('Category slug cannot be empty');
    }

    return new CategorySlug(normalized);
  }

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  equals(other: CategorySlug): boolean {
    return other instanceof CategorySlug && this.value === other.value;
  }
}
