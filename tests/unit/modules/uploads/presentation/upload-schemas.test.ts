import { describe, it, expect } from 'vitest';
import {
  presignedUrlSchema,
  confirmUploadSchema,
  readUrlSchema,
} from '@/modules/uploads/presentation/schemas/upload-schemas';

describe('Upload Schemas', () => {
  describe('presignedUrlSchema', () => {
    it('should accept valid presigned URL request', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid upload types', () => {
      for (const type of ['product', 'avatar', 'ticket', 'general']) {
        const result = presignedUrlSchema.safeParse({
          type,
          fileName: 'file.png',
          mimeType: 'image/png',
          size: 1000,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid upload type', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'invalid',
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing fileName', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        mimeType: 'image/jpeg',
        size: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing mimeType', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        fileName: 'file.jpg',
        size: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing size', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative size', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        size: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero size', () => {
      const result = presignedUrlSchema.safeParse({
        type: 'product',
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        size: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('confirmUploadSchema', () => {
    it('should accept empty body', () => {
      const result = confirmUploadSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept body with unknown properties', () => {
      const result = confirmUploadSchema.safeParse({ extra: 'data' });
      expect(result.success).toBe(true);
    });
  });

  describe('readUrlSchema', () => {
    it('should accept empty query', () => {
      const result = readUrlSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid expires parameter', () => {
      const result = readUrlSchema.safeParse({ expires: 7200 });
      expect(result.success).toBe(true);
    });

    it('should strip unknown properties', () => {
      const result = readUrlSchema.safeParse({ expires: 3600, extra: 'data' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ expires: 3600 });
      }
    });

    it('should reject negative expires', () => {
      const result = readUrlSchema.safeParse({ expires: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric expires', () => {
      const result = readUrlSchema.safeParse({ expires: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});
