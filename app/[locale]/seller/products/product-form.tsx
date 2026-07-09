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
import {
  productFormSchema,
  type ProductTranslationInput,
  type ProductCustomizationConfigInput,
} from '@/modules/products/presentation/schemas/product-form-schema';
import type { ProductPhotoDraft } from './product-photo-gallery';
import { ProductPhotoGallery } from './product-photo-gallery';
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
    images: Array<{
      url: string;
      alt: string | null;
    }>;
  };
  labels: ProductFormLabels;
  categories?: CategoryOption[];
}

interface FormState {
  price: string;
  activeLocale: SupportedLocale;
  translations: TranslationMap;
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

  const payload = {
    locale,
    name: current.name.trim(),
    description: current.description.trim() || undefined,
    price: form.price,
    translation: {
      tags: [...current.tags],
      sizes: [...current.sizes],
      designChangeDescription: current.designChangeDescription,
    },
    translations,
    customizationConfig,
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
  const initialLocale = normalizeLocale(locale);
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
      price: String(initialValues.price),
      activeLocale: initialLocale,
      translations: buildTranslationMap(initialLocale, initialValues),
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
        name: `Completa el nombre de la traducción ${missingTranslationLocale.toUpperCase()} antes de guardar.`,
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
          <PriceField
            label={labels.priceLabel}
            value={form.price}
            onChange={(v) => updateField('price', v)}
            error={errors.price}
            required
          />
        </div>

        <hr className={styles.divider} />

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
            {labels.save}
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
