'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ZodError } from 'zod';
import { Button } from '@/shared/ui/button';
import { BackLink } from '@/shared/ui/back-link';
import { Card } from '@/shared/ui/card';
import { PriceField } from '@/shared/ui/price-field';
import { ProductCustomizationConfigEditor } from '@/modules/products/presentation/components/product-customization-config-editor';
import {
  ProductLocaleTabs,
  type ProductLocale,
} from '@/modules/products/presentation/components/product-locale-tabs';
import {
  ProductTranslationSection,
  type ProductTranslationDraft,
} from '@/modules/products/presentation/components/product-translation-section';
import type { ProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import { toAbsoluteUrl } from '@/shared/presentation/lib/to-absolute-url';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import {
  productFormSchema,
  type ProductTranslationInput,
  type ProductCustomizationConfigInput,
} from '@/modules/products/presentation/schemas/product-form-schema';
import {
  ProductPhotoBucketGallery,
  type ProductPhotoDraft,
} from './product-photo-gallery';
import styles from './product-form.module.css';

type ProductFormMode = 'create' | 'edit';

type SupportedLocale = ProductLocale;

interface LocaleTranslationState extends ProductTranslationDraft {
  locale: SupportedLocale;
}

type TranslationMap = Record<SupportedLocale, LocaleTranslationState>;

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormImageSeed {
  url: string;
  alt: string | null;
  purpose?: ProductImagePurpose;
  mimeType?: string;
  posterUrl?: string | null;
}

interface ProductFormImageBucketsSeed {
  cover: ProductFormImageSeed | null;
  showcase: ProductFormImageSeed[];
  customizableBase: ProductFormImageSeed[];
}

type ProductFormImageSeeds =
  Array<ProductFormImageSeed> | ProductFormImageBucketsSeed;

interface ProductFormProps {
  locale: string;
  mode: ProductFormMode;
  productId?: string;
  initialValues: {
    price: number;
    name?: string;
    description?: string;
    translation?: ProductTranslationInput;
    translations?: Array<LocaleTranslationState>;
    customizationConfig: ProductCustomizationConfigInput;
    images: ProductFormImageSeeds;
  };
  labels: ProductFormLabels;
  categories?: CategoryOption[];
}

interface ProductPhotoBucketsState {
  cover: ProductPhotoDraft | null;
  showcase: ProductPhotoDraft[];
  customizableBase: ProductPhotoDraft[];
}

interface FormState {
  price: string;
  activeLocale: SupportedLocale;
  translations: TranslationMap;
  customizationConfig: ProductCustomizationConfigInput;
  images: ProductPhotoBucketsState;
  selectedPhotoId: string | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  images?: string;
  customizationConfig?: string;
}

function buildDefaultPhotoName(labels: ProductFormLabels, index: number) {
  return `${labels.gallery.defaultPhotoName} ${index + 1}`;
}

function normalizePhotoName(value: string, fallback: string) {
  const trimmed = value.trim();
  if (trimmed.length > 0) return trimmed;

  return fallback;
}

type ProductPhotoBucket = keyof ProductPhotoBucketsState;

interface ProductPhotoSeedEntry {
  seed: ProductFormImageSeed;
  bucket: ProductPhotoBucket;
}

function bucketForPurpose(
  purpose: ProductFormImageSeed['purpose'],
): ProductPhotoBucket {
  if (purpose === ProductImagePurpose.COVER) return 'cover';
  if (purpose === ProductImagePurpose.CUSTOMIZABLE_BASE) {
    return 'customizableBase';
  }

  return 'showcase';
}

function purposeForBucket(bucket: ProductPhotoBucket): ProductImagePurpose {
  if (bucket === 'cover') return ProductImagePurpose.COVER;
  if (bucket === 'customizableBase') {
    return ProductImagePurpose.CUSTOMIZABLE_BASE;
  }

  return ProductImagePurpose.SHOWCASE;
}

function getBucketIndex(
  bucket: ProductPhotoBucket,
  indexes: { cover: number; showcase: number; customizableBase: number },
): number {
  if (bucket === 'cover') return indexes.cover;
  if (bucket === 'customizableBase') return indexes.customizableBase;

  return indexes.showcase;
}

function collectInitialImageSeedEntries(
  images: ProductFormImageSeeds,
): ProductPhotoSeedEntry[] {
  if (Array.isArray(images)) {
    return images.map((seed) => ({
      seed,
      bucket: bucketForPurpose(seed.purpose),
    }));
  }

  return [
    ...(images.cover ? [{ seed: images.cover, bucket: 'cover' as const }] : []),
    ...images.showcase.map((seed) => ({ seed, bucket: 'showcase' as const })),
    ...images.customizableBase.map((seed) => ({
      seed,
      bucket: 'customizableBase' as const,
    })),
  ];
}

function populateInitialImageBuckets(
  labels: ProductFormLabels,
  buckets: ProductPhotoBucketsState,
  seedEntries: ProductPhotoSeedEntry[],
) {
  const indexes = { cover: 0, showcase: 0, customizableBase: 0 };

  for (const entry of seedEntries) {
    const bucketIndex = getBucketIndex(entry.bucket, indexes);
    const draft = createPhotoDraft(
      entry.seed,
      buildDefaultPhotoName(labels, bucketIndex),
      purposeForBucket(entry.bucket),
    );

    if (entry.bucket === 'cover') {
      buckets.cover = draft;
      indexes.cover += 1;
      continue;
    }

    if (entry.bucket === 'customizableBase') {
      buckets.customizableBase.push(draft);
      indexes.customizableBase += 1;
      continue;
    }

    buckets.showcase.push(draft);
    indexes.showcase += 1;
  }
}

function createPhotoDraft(
  seed: ProductFormImageSeed,
  fallbackName: string,
  purpose: ProductImagePurpose,
): ProductPhotoDraft {
  return {
    id: createPhotoId(),
    url: seed.url,
    alt: normalizePhotoName(seed.alt ?? '', fallbackName),
    size: null,
    purpose: seed.purpose ?? purpose,
    mimeType: seed.mimeType ?? 'image/jpeg',
    posterUrl: seed.posterUrl ?? null,
  };
}

function createEmptyBuckets(): ProductPhotoBucketsState {
  return {
    cover: null,
    showcase: [],
    customizableBase: [],
  };
}

function normalizeInitialImages(
  labels: ProductFormLabels,
  images: ProductFormImageSeeds,
): ProductPhotoBucketsState {
  const buckets = createEmptyBuckets();

  populateInitialImageBuckets(
    labels,
    buckets,
    collectInitialImageSeedEntries(images),
  );

  return buckets;
}

function moveItem<T extends { id: string }>(
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

function updateBucketPhoto(
  state: ProductPhotoBucketsState,
  bucket: keyof ProductPhotoBucketsState,
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

function removeBucketPhoto(
  state: ProductPhotoBucketsState,
  bucket: keyof ProductPhotoBucketsState,
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

function normalizeLocale(value: string): SupportedLocale {
  return value === 'cat' ? 'cat' : 'es';
}

function createTranslationDraft(
  locale: SupportedLocale,
): LocaleTranslationState {
  return {
    locale,
    name: '',
    description: '',
    tags: [],
    sizes: [],
    designChangeDescription: null,
  };
}

function normalizeTranslationDraft(
  locale: SupportedLocale,
  draft?: Partial<LocaleTranslationState>,
): LocaleTranslationState {
  return {
    ...createTranslationDraft(locale),
    ...draft,
    locale,
    tags: [...(draft?.tags ?? [])],
    sizes: [...(draft?.sizes ?? [])],
    designChangeDescription: draft?.designChangeDescription ?? null,
  };
}

function hasInactiveTranslationContent(
  translation: LocaleTranslationState,
): boolean {
  return (
    translation.description.trim().length > 0 ||
    translation.tags.length > 0 ||
    translation.sizes.length > 0 ||
    (translation.designChangeDescription?.trim().length ?? 0) > 0
  );
}

function findTranslationWithMissingName(
  form: FormState,
): SupportedLocale | null {
  const activeTranslation = form.translations[form.activeLocale];
  if (activeTranslation.name.trim().length === 0) {
    return form.activeLocale;
  }

  for (const translation of Object.values(form.translations)) {
    if (translation.locale === form.activeLocale) continue;

    if (
      translation.name.trim().length === 0 &&
      hasInactiveTranslationContent(translation)
    ) {
      return translation.locale;
    }
  }

  return null;
}

function buildTranslationMap(
  locale: SupportedLocale,
  initialValues: ProductFormProps['initialValues'],
): TranslationMap {
  const base: TranslationMap = {
    es: createTranslationDraft('es'),
    cat: createTranslationDraft('cat'),
  };

  if (initialValues.translations && initialValues.translations.length > 0) {
    for (const draft of initialValues.translations) {
      base[draft.locale] = normalizeTranslationDraft(draft.locale, draft);
    }
    return base;
  }

  const active = normalizeTranslationDraft(locale, {
    name: initialValues.name ?? '',
    description: initialValues.description ?? '',
    tags: initialValues.translation?.tags ?? [],
    sizes: initialValues.translation?.sizes ?? [],
    designChangeDescription:
      initialValues.translation?.designChangeDescription ?? null,
  });

  base[locale] = active;
  return base;
}

function buildPayload(locale: SupportedLocale, form: FormState) {
  const current = form.translations[locale];
  const customizationConfig = form.customizationConfig
    ? {
        ...form.customizationConfig,
      }
    : undefined;
  const currentDesignChangeDescription =
    current.designChangeDescription?.trim() ?? '';

  const translations = Object.values(form.translations)
    .map((translation) => {
      const name = translation.name.trim();
      const description = translation.description.trim();
      const designChangeDescription =
        translation.designChangeDescription?.trim() ?? '';

      return {
        locale: translation.locale,
        name,
        description: description.length > 0 ? description : undefined,
        tags: [...translation.tags],
        sizes: [...translation.sizes],
        designChangeDescription:
          designChangeDescription.length > 0 ? designChangeDescription : null,
      };
    })
    .filter(
      (translation) =>
        translation.name.length > 0 ||
        translation.description !== undefined ||
        translation.tags.length > 0 ||
        translation.sizes.length > 0 ||
        translation.designChangeDescription !== null,
    );

  const images = [
    ...(form.images.cover
      ? [
          {
            ...form.images.cover,
            position: 0,
          },
        ]
      : []),
    ...form.images.showcase.map((image, index) => ({
      ...image,
      position: index,
    })),
    ...form.images.customizableBase.map((image, index) => ({
      ...image,
      position: index,
    })),
  ].map((image) => ({
    url: image.url,
    alt: image.alt.trim(),
    position: image.position,
    purpose: image.purpose,
    mimeType: image.mimeType,
    posterUrl: image.posterUrl,
  }));

  const payload = {
    locale,
    name: current.name.trim(),
    description: current.description.trim() || undefined,
    price: form.price,
    translation: {
      tags: [...current.tags],
      sizes: [...current.sizes],
      designChangeDescription:
        currentDesignChangeDescription.length > 0
          ? currentDesignChangeDescription
          : null,
    },
    translations,
    customizationConfig,
    images,
  };

  const result = productFormSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error,
      payload,
    };
  }

  return { success: true as const, payload: result.data };
}

async function uploadPhoto(
  file: File,
  defaultName: string,
  purpose: ProductImagePurpose,
) {
  const response = await fetch('/api/uploads/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: UploadType.product,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });

  if (!response.ok) {
    let detail = 'Upload failed';
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch {
      /* empty */
    }
    throw new Error(detail);
  }

  const result = (await response.json()) as {
    id: string;
    uploadUrl: string;
    storageKey: string;
    publicUrl: string;
  };

  const uploadResponse = await fetch(result.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('File storage failed');
  }

  return {
    id: result.id,
    url: toAbsoluteUrl(result.publicUrl),
    alt: normalizePhotoName(
      file.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]+/g, ' '),
      defaultName,
    ),
    size: file.size,
    purpose,
    mimeType: file.type,
    posterUrl: null,
  } satisfies ProductPhotoDraft;
}

export function ProductForm({
  locale,
  mode,
  productId,
  initialValues,
  labels,
  categories = [],
}: ProductFormProps) {
  const router = useRouter();
  const initialLocale = normalizeLocale(locale);
  const [form, setForm] = useState<FormState>(() => {
    const images = normalizeInitialImages(labels, initialValues.images);

    return {
      price: String(initialValues.price),
      activeLocale: initialLocale,
      translations: buildTranslationMap(initialLocale, initialValues),
      customizationConfig: initialValues.customizationConfig,
      images,
      selectedPhotoId:
        images.cover?.id ??
        images.showcase[0]?.id ??
        images.customizableBase[0]?.id ??
        null,
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoLabels = labels.gallery;

  const endpoint = useMemo(
    () => (mode === 'create' ? '/api/products' : `/api/products/${productId}`),
    [mode, productId],
  );

  const updateField = <
    K extends keyof Pick<FormState, 'price' | 'customizationConfig'>,
  >(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!Object.hasOwn(current, field)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateLocale = (nextLocale: SupportedLocale) => {
    setForm((current) => ({ ...current, activeLocale: nextLocale }));
  };

  const updateTranslation = (patch: Partial<LocaleTranslationState>) => {
    setForm((current) => {
      const locale = current.activeLocale;
      const nextTranslation = normalizeTranslationDraft(locale, {
        ...current.translations[locale],
        ...patch,
        locale,
      });

      return {
        ...current,
        translations: {
          ...current.translations,
          [locale]: nextTranslation,
        },
      };
    });

    setErrors((current) => {
      if (!current.name && !current.description) return current;
      const next = { ...current };
      delete next.name;
      delete next.description;
      return next;
    });
  };

  const updatePhoto = (
    bucket: keyof ProductPhotoBucketsState,
    photoId: string,
    patch: Partial<ProductPhotoDraft>,
  ) => {
    setForm((current) => ({
      ...current,
      images: updateBucketPhoto(current.images, bucket, photoId, patch),
    }));
  };

  const removePhoto = (
    bucket: keyof ProductPhotoBucketsState,
    photoId: string,
  ) => {
    setForm((current) => {
      const nextImages = removeBucketPhoto(current.images, bucket, photoId);
      const nextSelected =
        current.selectedPhotoId === photoId
          ? (nextImages.cover?.id ??
            nextImages.showcase[0]?.id ??
            nextImages.customizableBase[0]?.id ??
            null)
          : current.selectedPhotoId;

      return {
        ...current,
        images: nextImages,
        selectedPhotoId: nextSelected,
      };
    });
  };

  const selectPhoto = (photoId: string) => {
    setForm((current) => ({ ...current, selectedPhotoId: photoId }));
  };

  const movePhoto = (
    bucket: keyof ProductPhotoBucketsState,
    photoId: string,
    direction: -1 | 1,
  ) => {
    if (bucket === 'cover') return;

    setForm((current) => ({
      ...current,
      images: {
        ...current.images,
        [bucket]: moveItem(current.images[bucket], photoId, direction),
      },
    }));
  };

  const handleUpload = async (
    bucket: keyof ProductPhotoBucketsState,
    files: File[],
  ) => {
    if (files.length === 0) return;

    setUploading(true);
    setPhotoError(null);

    try {
      const purpose = purposeForBucket(bucket);
      const existingCount = bucket === 'cover' ? 0 : form.images[bucket].length;
      const uploads = await Promise.all(
        files.map((file, index) =>
          uploadPhoto(
            file,
            buildDefaultPhotoName(labels, existingCount + index),
            purpose,
          ),
        ),
      );

      setForm((current) => {
        const nextImages =
          bucket === 'cover'
            ? {
                ...current.images,
                cover: uploads[0] ?? current.images.cover,
              }
            : {
                ...current.images,
                [bucket]: [...current.images[bucket], ...uploads],
              };

        return {
          ...current,
          images: nextImages,
          selectedPhotoId:
            bucket === 'cover'
              ? (uploads[0]?.id ?? current.selectedPhotoId ?? null)
              : (current.selectedPhotoId ?? uploads[0]?.id ?? null),
        };
      });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : labels.gallery.uploadError,
      );
    } finally {
      setUploading(false);
    }
  };

  const mapErrors = (error: ZodError): FormErrors => {
    const next: FormErrors = {};

    for (const issue of error.issues) {
      const path = issue.path[0] as keyof FormErrors | undefined;
      if (path !== undefined && !Object.hasOwn(next, path)) {
        next[path] = issue.message;
      }
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSaved(null);
    setErrors({});

    const missingTranslationLocale = findTranslationWithMissingName(form);
    if (missingTranslationLocale) {
      setForm((current) => ({
        ...current,
        activeLocale: missingTranslationLocale,
      }));
      setErrors({
        name: labels.missingTranslationNameError
          .split('{locale}')
          .join(missingTranslationLocale.toUpperCase()),
      });
      return;
    }

    const parsed = buildPayload(form.activeLocale, form);

    if (!parsed.success) {
      setErrors(mapErrors(parsed.error));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.payload),
      });

      if (!response.ok) {
        let data: { error?: string } | null = null;
        try {
          data = (await response.json()) as { error?: string } | null;
        } catch {
          data = null;
        }
        throw new Error(data?.error || labels.error);
      }

      setSaved(labels.saved);
      router.push(`/${locale}/seller/products`);
      router.refresh();
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <BackLink href={`/${locale}/seller/products`}>
        {labels.backToProducts}
      </BackLink>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{labels.customization.label}</p>
          <h1 className={styles.title}>{labels.title}</h1>
          <p className={styles.subtitle}>{labels.customization.hint}</p>
        </div>
      </header>

      {serverError ? (
        <p className={styles.alert} role="alert">
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p className={styles.success} role="status">
          {saved}
        </p>
      ) : null}

      <Card padding="md">
        <div className={styles.formBody}>
          <ProductLocaleTabs
            value={form.activeLocale}
            onChange={updateLocale}
            labels={labels.localeTabs}
          />

          <ProductTranslationSection
            locale={form.activeLocale}
            value={form.translations[form.activeLocale]}
            onChange={updateTranslation}
            labels={labels.translationSection}
            errors={{ name: errors.name, description: errors.description }}
          />
        </div>

        <hr className={styles.divider} />

        <div className={styles.formBody}>
          <PriceField
            label={labels.priceLabel}
            value={form.price}
            onChange={(v) => updateField('price', v)}
            error={errors.price}
            required
          />

          {errors.images ? (
            <p className={styles.alert} role="alert">
              {errors.images}
            </p>
          ) : null}

          {photoError ? (
            <p className={styles.error} role="alert">
              {photoError}
            </p>
          ) : null}

          <div className={styles['gallery-stack']}>
            <ProductPhotoBucketGallery
              mode="single"
              labels={photoLabels.buckets.cover}
              commonLabels={photoLabels}
              photos={form.images.cover ? [form.images.cover] : []}
              selectedPhotoId={form.selectedPhotoId}
              accept="image/png,image/jpeg,image/webp"
              onFilesSelected={(files) => handleUpload('cover', files)}
              onPhotoLabelChange={(photoId, alt) =>
                updatePhoto('cover', photoId, { alt })
              }
              onSelectPhoto={selectPhoto}
              onRemovePhoto={(photoId) => removePhoto('cover', photoId)}
              uploading={uploading}
              error={null}
            />

            <ProductPhotoBucketGallery
              mode="multiple"
              labels={photoLabels.buckets.showcase}
              commonLabels={photoLabels}
              photos={form.images.showcase}
              selectedPhotoId={form.selectedPhotoId}
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              onFilesSelected={(files) => handleUpload('showcase', files)}
              onPhotoLabelChange={(photoId, alt) =>
                updatePhoto('showcase', photoId, { alt })
              }
              onSelectPhoto={selectPhoto}
              onRemovePhoto={(photoId) => removePhoto('showcase', photoId)}
              onMovePhotoUp={(photoId) => movePhoto('showcase', photoId, -1)}
              onMovePhotoDown={(photoId) => movePhoto('showcase', photoId, 1)}
              onPosterUrlChange={(photoId, posterUrl) =>
                updatePhoto('showcase', photoId, {
                  posterUrl:
                    posterUrl.trim().length > 0 ? posterUrl.trim() : null,
                })
              }
              uploading={uploading}
              error={null}
            />

            <ProductPhotoBucketGallery
              mode="multiple"
              labels={photoLabels.buckets.customizableBase}
              commonLabels={photoLabels}
              photos={form.images.customizableBase}
              selectedPhotoId={form.selectedPhotoId}
              accept="image/png,image/jpeg,image/webp"
              onFilesSelected={(files) =>
                handleUpload('customizableBase', files)
              }
              onPhotoLabelChange={(photoId, alt) =>
                updatePhoto('customizableBase', photoId, { alt })
              }
              onSelectPhoto={selectPhoto}
              onRemovePhoto={(photoId) =>
                removePhoto('customizableBase', photoId)
              }
              onMovePhotoUp={(photoId) =>
                movePhoto('customizableBase', photoId, -1)
              }
              onMovePhotoDown={(photoId) =>
                movePhoto('customizableBase', photoId, 1)
              }
              uploading={uploading}
              error={null}
            />
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.formBody}>
          <ProductCustomizationConfigEditor
            value={form.customizationConfig}
            labels={labels.customization.editor}
            categories={categories}
            onChange={(value) => updateField('customizationConfig', value)}
          />

          {errors.customizationConfig ? (
            <p className={styles.alert} role="alert">
              {errors.customizationConfig}
            </p>
          ) : null}
        </div>

        <div className={styles.buttonRow}>
          <Button type="submit" loading={loading || uploading}>
            {labels.submit}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function createPhotoId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `photo-${Date.now()}-${crypto.randomUUID()}`
  );
}
