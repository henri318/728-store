import { describe, it, expect } from 'vitest';
import {
  UPLOAD_ERROR_MAP,
  UPLOAD_ERROR_CODES,
} from '@/modules/uploads/application/upload-error-map';
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from '@/modules/uploads/application/create-upload-use-case';

describe('upload-error-map', () => {
  it('maps file-too-large error code to uploadErrorTooLarge i18n key', () => {
    expect(UPLOAD_ERROR_MAP['file-too-large']).toBe('uploadErrorTooLarge');
  });

  it('maps invalid-mime error code to uploadErrorInvalidFormat i18n key', () => {
    expect(UPLOAD_ERROR_MAP['invalid-mime']).toBe('uploadErrorInvalidFormat');
  });

  it('exports UPLOAD_ERROR_CODES constant with file-too-large value', () => {
    expect(UPLOAD_ERROR_CODES.FILE_TOO_LARGE).toBe('file-too-large');
  });

  it('exports UPLOAD_ERROR_CODES constant with invalid-mime value', () => {
    expect(UPLOAD_ERROR_CODES.INVALID_MIME).toBe('invalid-mime');
  });
});

describe('create-upload-use-case exported constants', () => {
  it('exports MAX_FILE_SIZE as 10 MB (10 * 1024 * 1024)', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('exports ALLOWED_MIME_TYPES containing image/jpeg', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
  });

  it('exports ALLOWED_MIME_TYPES containing image/png', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
  });

  it('exports ALLOWED_MIME_TYPES containing image/webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
  });

  it('exports ALLOWED_MIME_TYPES containing video/mp4', () => {
    expect(ALLOWED_MIME_TYPES).toContain('video/mp4');
  });

  it('exports ALLOWED_MIME_TYPES containing video/webm', () => {
    expect(ALLOWED_MIME_TYPES).toContain('video/webm');
  });
});
