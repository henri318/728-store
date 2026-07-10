import { ValidationError } from '@/shared/kernel/app-error';

export enum ProductImagePurpose {
  COVER = 'COVER',
  SHOWCASE = 'SHOWCASE',
  CUSTOMIZABLE_BASE = 'CUSTOMIZABLE_BASE',
}

export const ALLOWED_MIME_BY_PURPOSE: Readonly<
  Record<ProductImagePurpose, readonly string[]>
> = Object.freeze({
  [ProductImagePurpose.COVER]: Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  [ProductImagePurpose.SHOWCASE]: Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
  ]),
  [ProductImagePurpose.CUSTOMIZABLE_BASE]: Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
});

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('video/');
}

export function assertPurposeForMime(
  purpose: ProductImagePurpose,
  mimeType: string,
): void {
  const normalizedMimeType = mimeType.toLowerCase();

  if (!ALLOWED_MIME_BY_PURPOSE[purpose].includes(normalizedMimeType)) {
    throw new ValidationError(
      `MIME type ${mimeType} not allowed for purpose ${purpose}`,
    );
  }
}

export function assertSingleCover(
  images: ReadonlyArray<{ purpose: ProductImagePurpose }>,
): void {
  const coverCount = images.filter(
    (image) => image.purpose === ProductImagePurpose.COVER,
  ).length;

  if (coverCount > 1) {
    throw new ValidationError('Only one COVER image is allowed per product');
  }
}
