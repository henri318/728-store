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

/**
 * File extensions allowed for uploads.
 * Must correspond to the allowed MIME types above.
 */
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/**
 * Returns true if the file extension is in the allowed whitelist.
 * Comparison is case-insensitive.
 */
export function isAllowedExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return !!ext && (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}
