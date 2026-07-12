/**
 * Upload error code → i18n dictionary key mapping.
 *
 * Centralises the mapping between upload domain error codes and the
 * translation keys used by the presentation layer to render user-facing
 * error messages.
 */
export const UPLOAD_ERROR_MAP: Record<string, string> = {
  'file-too-large': 'uploadErrorTooLarge',
  'invalid-mime': 'uploadErrorInvalidFormat',
};

export const UPLOAD_ERROR_CODES = {
  FILE_TOO_LARGE: 'file-too-large',
  INVALID_MIME: 'invalid-mime',
} as const;
