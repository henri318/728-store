import type { UploadType } from '../value-objects/upload-type';
import type { UploadStatus } from '../value-objects/upload-status';

/**
 * UploadEntity — a pure data interface representing an uploaded file.
 *
 * Follows the project pattern (ProductEntity): plain interface, no class.
 * Value objects are validated at use-case boundaries.
 */
export interface UploadEntity {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly size: number;
  readonly uploadedBy: string;
  readonly type: UploadType;
  readonly status: UploadStatus;
  readonly createdAt: Date;
}
