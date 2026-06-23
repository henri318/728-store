/**
 * TagEntity — a pure data interface representing a product tag.
 *
 * Fields:
 *  - id: unique identifier
 *  - name: display name (unique across all tags)
 *  - slug: URL-friendly identifier (unique across all tags)
 *  - createdAt: timestamp
 */
export interface TagEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
}
