import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import type { ProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import type { ProductPhotoDraft } from './product-photo-gallery';
import type {
  ProductFormImageSeed,
  ProductFormImageSeeds,
  ProductPhotoBucket,
  ProductPhotoBucketsState,
} from './product-form-types';

function buildDefaultPhotoName(labels: ProductFormLabels, index: number) {
  return `${labels.gallery.defaultPhotoName} ${index + 1}`;
}

export function normalizePhotoName(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function purposeForBucket(
  bucket: ProductPhotoBucket,
): ProductImagePurpose {
  if (bucket === 'cover') return ProductImagePurpose.COVER;
  if (bucket === 'customizableBase')
    return ProductImagePurpose.CUSTOMIZABLE_BASE;
  return ProductImagePurpose.SHOWCASE;
}

function bucketForPurpose(
  purpose: ProductFormImageSeed['purpose'],
): ProductPhotoBucket {
  if (purpose === ProductImagePurpose.COVER) return 'cover';
  if (purpose === ProductImagePurpose.CUSTOMIZABLE_BASE)
    return 'customizableBase';
  return 'showcase';
}

function createPhotoDraft(
  seed: ProductFormImageSeed,
  fallbackName: string,
  purpose: ProductImagePurpose,
): ProductPhotoDraft {
  return {
    id: seed.id ?? createPhotoId(),
    url: seed.url,
    alt: normalizePhotoName(seed.alt ?? '', fallbackName),
    size: null,
    purpose,
    mimeType: seed.mimeType ?? 'image/jpeg',
    posterUrl: seed.posterUrl ?? null,
  };
}

function createEmptyBuckets(): ProductPhotoBucketsState {
  return { cover: null, showcase: [], customizableBase: [] };
}

export function normalizeInitialImages(
  labels: ProductFormLabels,
  images: ProductFormImageSeeds,
): ProductPhotoBucketsState {
  const buckets = createEmptyBuckets();
  const entries = Array.isArray(images)
    ? images.map((seed) => ({ seed, bucket: bucketForPurpose(seed.purpose) }))
    : [
        ...(images.cover
          ? [{ seed: images.cover, bucket: 'cover' as const }]
          : []),
        ...images.showcase.map((seed) => ({
          seed,
          bucket: 'showcase' as const,
        })),
        ...images.customizableBase.map((seed) => ({
          seed,
          bucket: 'customizableBase' as const,
        })),
      ];
  const indexes = { cover: 0, showcase: 0, customizableBase: 0 };

  for (const { seed, bucket } of entries) {
    const index = indexes[bucket]++;
    const draft = createPhotoDraft(
      seed,
      buildDefaultPhotoName(labels, index),
      purposeForBucket(bucket),
    );

    if (bucket === 'cover') buckets.cover = draft;
    else buckets[bucket].push(draft);
  }

  return buckets;
}

export function moveItem<T extends { id: string }>(
  items: T[],
  itemId: string,
  direction: -1 | 1,
) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  const nextIndex = currentIndex + direction;
  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function updateBucketPhoto(
  state: ProductPhotoBucketsState,
  bucket: ProductPhotoBucket,
  photoId: string,
  patch: Partial<ProductPhotoDraft>,
): ProductPhotoBucketsState {
  if (bucket === 'cover') {
    if (!state.cover || state.cover.id !== photoId) return state;
    return { ...state, cover: { ...state.cover, ...patch } };
  }

  return {
    ...state,
    [bucket]: state[bucket].map((photo) =>
      photo.id === photoId ? { ...photo, ...patch } : photo,
    ),
  };
}

export function removeBucketPhoto(
  state: ProductPhotoBucketsState,
  bucket: ProductPhotoBucket,
  photoId: string,
): ProductPhotoBucketsState {
  if (bucket === 'cover') {
    if (!state.cover || state.cover.id !== photoId) return state;
    return { ...state, cover: null };
  }

  return {
    ...state,
    [bucket]: state[bucket].filter((photo) => photo.id !== photoId),
  };
}

export function photoIdsFor(images: ProductPhotoBucketsState) {
  return new Set(images.customizableBase.map((photo) => photo.id));
}

export function defaultPhotoName(labels: ProductFormLabels, index: number) {
  return buildDefaultPhotoName(labels, index);
}

function createPhotoId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `photo-${Date.now()}-${crypto.randomUUID()}`
  );
}
