/**
 * UploadStatus — the valid lifecycle states for an upload.
 *
 * PENDING  → CONFIRMED (upload completed and verified)
 * CONFIRMED is terminal.
 */
export enum UploadStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
}
