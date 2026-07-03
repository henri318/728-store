import { z } from 'zod';
import { UploadType } from '@prisma/client';

/**
 * Zod schemas for the uploads presentation layer (HTTP request validation).
 *
 * Validates request bodies and query parameters before passing to use cases.
 */

/** POST /api/uploads/presigned-url */
export const presignedUrlSchema = z.object({
  type: z.nativeEnum(UploadType),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

/** POST /api/uploads/guest/presigned-url */
export const guestPresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export type GuestPresignedUrlInput = z.infer<typeof guestPresignedUrlSchema>;

/** POST /api/uploads/[id]/confirm */
export const confirmUploadSchema = z.object({});

/** GET /api/uploads/[id]/url */
export const readUrlSchema = z.object({
  expires: z.coerce.number().int().positive().optional(),
});
