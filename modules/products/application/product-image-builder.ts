import { randomUUID } from 'node:crypto';
import type { ProductEntity } from '../domain/product-repository';
import {
  ProductImagePurpose,
  assertPurposeForMime,
  assertSingleCover,
} from '../domain/value-objects/product-image-purpose';

export interface ProductImageInput {
  id?: string;
  url: string;
  alt: string;
  purpose?: ProductImagePurpose;
  mimeType?: string;
  posterUrl?: string | null;
}

export interface BuildProductImagesOptions {
  productId: string;
  createdAt: Date;
  existingImages?: ReadonlyArray<ProductEntity['images'][number]>;
}

const DEFAULT_PURPOSE = ProductImagePurpose.CUSTOMIZABLE_BASE;
const DEFAULT_MIME_TYPE = 'image/jpeg';

function resolveImageMetadata(
  input: ProductImageInput,
  existingImage?: ProductEntity['images'][number],
): {
  purpose: ProductImagePurpose;
  mimeType: string;
  posterUrl: string | null;
} {
  const purpose = input.purpose ?? existingImage?.purpose ?? DEFAULT_PURPOSE;
  const mimeType =
    input.mimeType ?? existingImage?.mimeType ?? DEFAULT_MIME_TYPE;
  const posterUrl = input.posterUrl ?? existingImage?.posterUrl ?? null;

  assertPurposeForMime(purpose, mimeType);

  return {
    purpose,
    mimeType,
    posterUrl,
  };
}

export function buildProductImages(
  inputs: ReadonlyArray<ProductImageInput>,
  options: BuildProductImagesOptions,
): ProductEntity['images'] {
  const images = inputs.map((input, index) => {
    const existingImage = options.existingImages?.[index];
    const metadata = resolveImageMetadata(input, existingImage);

    return {
      id: input.id ?? existingImage?.id ?? randomUUID(),
      url: input.url,
      alt: input.alt,
      position: index,
      ...metadata,
      productId: options.productId,
      createdAt: options.createdAt,
    };
  });

  assertSingleCover(images);

  return images;
}
