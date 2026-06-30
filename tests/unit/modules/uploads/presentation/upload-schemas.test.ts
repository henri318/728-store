import { describe, it, expect } from 'vitest';
import {
  presignedUrlSchema,
  confirmUploadSchema,
  readUrlSchema,
} from '@/modules/uploads/presentation/schemas/upload-schemas';

describe('Upload Schemas', () => {
  describe('presignedUrlSchema', () => {
    it('accepts a valid presigned URL request and all supported types', () => {
      expect(
        presignedUrlSchema.safeParse({
          type: 'product',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 102400,
        }).success,
      ).toBe(true);

      for (const type of ['product', 'avatar', 'ticket', 'general'] as const) {
        expect(
          presignedUrlSchema.safeParse({
            type,
            fileName: 'file.png',
            mimeType: 'image/png',
            size: 1000,
          }).success,
        ).toBe(true);
      }
    });

    it('rejects invalid and incomplete payloads', () => {
      for (const input of [
        {
          type: 'invalid',
          fileName: 'file.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
        },
        { type: 'product', mimeType: 'image/jpeg', size: 1000 },
        { type: 'product', fileName: 'file.jpg', size: 1000 },
        { type: 'product', fileName: 'file.jpg', mimeType: 'image/jpeg' },
      ]) {
        expect(presignedUrlSchema.safeParse(input).success).toBe(false);
      }
    });

    it('rejects invalid sizes', () => {
      for (const size of [-1, 0]) {
        expect(
          presignedUrlSchema.safeParse({
            type: 'product',
            fileName: 'file.jpg',
            mimeType: 'image/jpeg',
            size,
          }).success,
        ).toBe(false);
      }
    });
  });

  describe('confirmUploadSchema', () => {
    it('accepts empty bodies and unknown properties', () => {
      for (const input of [{}, { extra: 'data' }]) {
        expect(confirmUploadSchema.safeParse(input).success).toBe(true);
      }
    });
  });

  describe('readUrlSchema', () => {
    it('accepts empty query and valid expires values', () => {
      for (const input of [{}, { expires: 7200 }]) {
        expect(readUrlSchema.safeParse(input).success).toBe(true);
      }
    });

    it('strips unknown properties from the parsed data', () => {
      const result = readUrlSchema.safeParse({ expires: 3600, extra: 'data' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ expires: 3600 });
      }
    });

    it('rejects invalid expires values', () => {
      for (const input of [{ expires: -1 }, { expires: 'invalid' }]) {
        expect(readUrlSchema.safeParse(input).success).toBe(false);
      }
    });
  });
});
