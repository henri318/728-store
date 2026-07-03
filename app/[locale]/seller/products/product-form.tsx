'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ZodError } from 'zod';
import { ProductCustomizationConfigEditor } from '@/modules/products/presentation/components/product-customization-config-editor';
import { toAbsoluteUrl } from '@/shared/presentation/lib/to-absolute-url';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import {
  productFormSchema,
  type ProductCustomizationConfigInput,
} from '@/modules/products/presentation/schemas/product-form-schema';
import type { ProductPhotoDraft } from './product-photo-gallery';
import { ProductPhotoGallery } from './product-photo-gallery';
import styles from './product-form.module.css';

type ProductFormMode = 'create' | 'edit';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormLabels {
  title: string;
  backToProducts: string;
  nameLabel: string;
  descriptionLabel: string;
  priceLabel: string;
  save: string;
  saved: string;
  error: string;
  customization: {
    label: string;
    hint: string;
    editor: {
      sizeOptionsLabel: string;
      sizeOptionsPlaceholder: string;
      allowPhotoDesignLabel: string;
      designChangeDescriptionLabel: string;
      designChangeDescriptionPlaceholder: string;
      categoryLabel: string;
      categoryPlaceholder: string;
      tagsLabel: string;
      tagsPlaceholder: string;
      tagsHelp: string;
    };
  };
  gallery: {
    title: string;
    hint: string;
    addPhotoLabel: string;
    photoDisplayNameLabel: string;
    photoDisplayNamePlaceholder: string;
    selectForPreviewLabel: string;
    removePhotoLabel: string;
    uploadingLabel: string;
    emptyState: string;
    uploadError: string;
    defaultPhotoName: string;
  };
}

interface ProductFormProps {
  locale: string;
  mode: ProductFormMode;
  productId?: string;
  initialValues: {
    name: string;
    description: string;
    price: number;
    customizationConfig: ProductCustomizationConfigInput;
    images: Array<{
      url: string;
      alt: string | null;
    }>;
  };
  labels: ProductFormLabels;
  categories?: CategoryOption[];
}

interface FormState {
  name: string;
  description: string;
  price: string;
  customizationConfig: ProductCustomizationConfigInput;
  images: ProductPhotoDraft[];
  selectedPhotoId: string | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
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

function createPhotoId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}-${Math.random()}`
  );
}

function buildPayload(locale: string, form: FormState) {
  const payload = {
    locale,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    price: form.price,
    customizationConfig: form.customizationConfig,
    images: form.images.map((image, index) => ({
      url: image.url,
      alt: image.alt.trim(),
      position: index,
    })),
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

async function uploadPhoto(file: File, defaultName: string) {
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
    throw new Error('Upload failed');
  }

  const result = (await response.json()) as {
    id: string;
    uploadUrl: string;
    storageKey: string;
    publicUrl: string;
  };

  await fetch(result.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });

  return {
    id: result.id,
    url: toAbsoluteUrl(result.publicUrl),
    alt: normalizePhotoName(
      file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      defaultName,
    ),
    size: file.size,
    previewSelected: false,
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
  const [form, setForm] = useState<FormState>(() => {
    const images = initialValues.images.map((image, index) => ({
      id: createPhotoId(),
      url: image.url,
      alt: normalizePhotoName(
        image.alt ?? '',
        buildDefaultPhotoName(labels, index),
      ),
      previewSelected: index === 0,
    }));

    return {
      name: initialValues.name,
      description: initialValues.description,
      price: String(initialValues.price),
      customizationConfig: initialValues.customizationConfig,
      images,
      selectedPhotoId: images[0]?.id ?? null,
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => (mode === 'create' ? '/api/products' : `/api/products/${productId}`),
    [mode, productId],
  );

  const updateField = <
    K extends keyof Pick<
      FormState,
      'name' | 'description' | 'price' | 'customizationConfig'
    >,
  >(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updatePhoto = (photoId: string, patch: Partial<ProductPhotoDraft>) => {
    setForm((current) => ({
      ...current,
      images: current.images.map((photo) =>
        photo.id === photoId ? { ...photo, ...patch } : photo,
      ),
    }));
  };

  const removePhoto = (photoId: string) => {
    setForm((current) => {
      const nextImages = current.images.filter((photo) => photo.id !== photoId);
      const nextSelected =
        current.selectedPhotoId === photoId
          ? (nextImages[0]?.id ?? null)
          : current.selectedPhotoId;

      return {
        ...current,
        images: nextImages,
        selectedPhotoId: nextSelected,
      };
    });
  };

  const selectPhoto = (photoId: string) => {
    setForm((current) => ({
      ...current,
      selectedPhotoId: photoId,
      images: current.images.map((photo) => ({
        ...photo,
        previewSelected: photo.id === photoId,
      })),
    }));
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setPhotoError(null);

    try {
      const uploads = await Promise.all(
        files.map((file, index) =>
          uploadPhoto(
            file,
            buildDefaultPhotoName(labels, form.images.length + index),
          ),
        ),
      );

      setForm((current) => {
        const nextImages = [...current.images, ...uploads].map(
          (photo, index) => ({
            ...photo,
            previewSelected:
              current.selectedPhotoId === photo.id ||
              (!current.selectedPhotoId && index === 0),
          }),
        );

        return {
          ...current,
          images: nextImages,
          selectedPhotoId:
            current.selectedPhotoId ??
            uploads[0]?.id ??
            current.images[0]?.id ??
            null,
        };
      });
    } catch {
      setPhotoError(labels.gallery.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const mapErrors = (error: ZodError): FormErrors => {
    const next: FormErrors = {};

    for (const issue of error.issues) {
      const path = issue.path[0] as keyof FormErrors | undefined;
      if (path && !next[path]) {
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

    const parsed = buildPayload(locale, form);

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
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
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
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{labels.customization.label}</p>
          <h1 className={styles.title}>{labels.title}</h1>
          <p className={styles.subtitle}>{labels.customization.hint}</p>
        </div>

        <Link className={styles.backLink} href={`/${locale}/seller/products`}>
          {labels.backToProducts}
        </Link>
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

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>{labels.title}</h2>
              <p className={styles.cardHint}>{labels.customization.hint}</p>
            </div>
          </div>

          <label className={styles.field} htmlFor="product-name">
            <span>{labels.nameLabel}</span>
            <input
              id="product-name"
              className={styles.input}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
            {errors.name ? <p className={styles.error}>{errors.name}</p> : null}
          </label>

          <label className={styles.field} htmlFor="product-description">
            <span>{labels.descriptionLabel}</span>
            <textarea
              id="product-description"
              className={styles.textarea}
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              rows={4}
            />
            {errors.description ? (
              <p className={styles.error}>{errors.description}</p>
            ) : null}
          </label>

          <label className={styles.field} htmlFor="product-price">
            <span>{labels.priceLabel}</span>
            <input
              id="product-price"
              className={styles.input}
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              required
            />
            {errors.price ? (
              <p className={styles.error}>{errors.price}</p>
            ) : null}
          </label>
        </section>

        <section className={styles.card}>
          <ProductPhotoGallery
            photos={form.images}
            selectedPhotoId={form.selectedPhotoId}
            labels={labels.gallery}
            onFilesSelected={handleUpload}
            onPhotoLabelChange={(photoId, alt) => updatePhoto(photoId, { alt })}
            onSelectPhoto={selectPhoto}
            onRemovePhoto={removePhoto}
            uploading={uploading}
            error={photoError}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>{labels.customization.label}</h2>
              <p className={styles.cardHint}>{labels.customization.hint}</p>
            </div>
          </div>

          <ProductCustomizationConfigEditor
            value={form.customizationConfig}
            labels={labels.customization.editor}
            categories={categories}
            onChange={(value) => updateField('customizationConfig', value)}
          />

          {errors.customizationConfig ? (
            <p className={styles.error}>{errors.customizationConfig}</p>
          ) : null}
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          className={styles.saveButton}
          type="submit"
          disabled={loading || uploading}
        >
          {labels.save}
        </button>
      </footer>
    </form>
  );
}
