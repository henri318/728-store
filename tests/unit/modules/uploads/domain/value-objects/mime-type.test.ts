import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  isAllowedExtension,
  isAllowedMimeType,
  isVideoMimeType,
} from '@/modules/uploads/domain/value-objects/mime-type';

describe('mime-type value object', () => {
  it('allows the expected image and video MIME types', () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
    ]);
    expect(isAllowedMimeType('IMAGE/JPEG')).toBe(true);
    expect(isAllowedMimeType('video/mp4')).toBe(true);
    expect(isAllowedMimeType('application/pdf')).toBe(false);
  });

  it('allows matching video extensions', () => {
    expect(ALLOWED_EXTENSIONS).toEqual([
      'jpg',
      'jpeg',
      'png',
      'webp',
      'mp4',
      'webm',
    ]);
    expect(isAllowedExtension('clip.MP4')).toBe(true);
    expect(isAllowedExtension('clip.webm')).toBe(true);
    expect(isAllowedExtension('clip.svg')).toBe(false);
  });

  it('detects video MIME types', () => {
    expect(isVideoMimeType('video/mp4')).toBe(true);
    expect(isVideoMimeType('VIDEO/WEBM')).toBe(true);
    expect(isVideoMimeType('image/jpeg')).toBe(false);
  });
});
