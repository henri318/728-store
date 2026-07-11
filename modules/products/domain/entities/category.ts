/**
 * CategoryEntity — a pure data interface representing a product category.
 *
 * Supports hierarchical structure via parentId self-reference.
 *
 * Fields:
 *  - id: unique identifier
 *  - translations: localized display names
 *  - slug: URL-friendly identifier (unique)
 *  - parentId: optional FK to parent Category (null = root category)
 *  - createdAt: timestamp
 */
export interface CategoryEntity {
  readonly id: string;
  readonly slug: string;
  readonly parentId: string | null;
  readonly createdAt: Date;
  readonly translations: readonly import('./category-translation').CategoryTranslationEntity[];
}
