/**
 * UploadType — the valid categories for an upload.
 *
 * Determines storage key prefix and downstream processing
 * (e.g. product images vs. user avatars).
 */
export enum UploadType {
  PRODUCT = 'product',
  AVATAR = 'avatar',
  TICKET = 'ticket',
  GENERAL = 'general',
}
