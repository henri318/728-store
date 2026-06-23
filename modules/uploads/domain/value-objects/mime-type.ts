/**
 * MIME type whitelist for uploads.
 *
 * Only these image types are accepted. The validation helper
 * normalizes to lowercase before checking.
 */

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Returns true if the given MIME type is in the allowed whitelist.
 * Comparison is case-insensitive.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase() as AllowedMimeType);
}
