import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_BY_PURPOSE,
  ProductImagePurpose,
  assertPurposeForMime,
  assertSingleCover,
  isVideoMimeType,
} from '@/modules/products/domain/value-objects/product-image-purpose';

describe('ProductImagePurpose', () => {
  it('defines the three allowed purpose values', () => {
    expect(ProductImagePurpose.COVER).toBe('COVER');
    expect(ProductImagePurpose.SHOWCASE).toBe('SHOWCASE');
    expect(ProductImagePurpose.CUSTOMIZABLE_BASE).toBe('CUSTOMIZABLE_BASE');
    expect(Object.values(ProductImagePurpose)).toHaveLength(3);
  });
});

describe('ALLOWED_MIME_BY_PURPOSE', () => {
  it('allows video only for SHOWCASE', () => {
    expect(ALLOWED_MIME_BY_PURPOSE[ProductImagePurpose.SHOWCASE]).toContain(
      'video/mp4',
    );
    expect(ALLOWED_MIME_BY_PURPOSE[ProductImagePurpose.SHOWCASE]).toContain(
      'video/webm',
    );
    expect(ALLOWED_MIME_BY_PURPOSE[ProductImagePurpose.COVER]).not.toContain(
      'video/mp4',
    );
    expect(
      ALLOWED_MIME_BY_PURPOSE[ProductImagePurpose.CUSTOMIZABLE_BASE],
    ).not.toContain('video/webm');
  });
});

describe('assertPurposeForMime', () => {
  it('accepts image/jpeg for COVER', () => {
    expect(() =>
      assertPurposeForMime(ProductImagePurpose.COVER, 'image/jpeg'),
    ).not.toThrow();
  });

  it('rejects video MIME types for COVER and CUSTOMIZABLE_BASE', () => {
    expect(() =>
      assertPurposeForMime(ProductImagePurpose.COVER, 'video/mp4'),
    ).toThrow(/COVER/);
    expect(() =>
      assertPurposeForMime(ProductImagePurpose.CUSTOMIZABLE_BASE, 'video/webm'),
    ).toThrow(/CUSTOMIZABLE_BASE/);
  });

  it('rejects SVG for every purpose', () => {
    expect(() =>
      assertPurposeForMime(ProductImagePurpose.COVER, 'image/svg+xml'),
    ).toThrow();
    expect(() =>
      assertPurposeForMime(ProductImagePurpose.SHOWCASE, 'image/svg+xml'),
    ).toThrow();
    expect(() =>
      assertPurposeForMime(
        ProductImagePurpose.CUSTOMIZABLE_BASE,
        'image/svg+xml',
      ),
    ).toThrow();
  });
});

describe('assertSingleCover', () => {
  it('accepts zero or one COVER image', () => {
    expect(() => assertSingleCover([])).not.toThrow();
    expect(() =>
      assertSingleCover([
        { purpose: ProductImagePurpose.SHOWCASE },
        { purpose: ProductImagePurpose.COVER },
      ]),
    ).not.toThrow();
  });

  it('rejects more than one COVER image', () => {
    expect(() =>
      assertSingleCover([
        { purpose: ProductImagePurpose.COVER },
        { purpose: ProductImagePurpose.COVER },
      ]),
    ).toThrow(/only one cover/i);
  });
});

describe('isVideoMimeType', () => {
  it('detects video MIME types', () => {
    expect(isVideoMimeType('video/mp4')).toBe(true);
    expect(isVideoMimeType('video/webm')).toBe(true);
    expect(isVideoMimeType('image/jpeg')).toBe(false);
  });
});
