import { useCallback } from 'react';
import type { ProductPhotoDraft } from './product-photo-gallery';
import {
  moveItem,
  removeBucketPhoto,
  updateBucketPhoto,
} from './product-form-image-helpers';
import {
  normalizeTranslationDraft,
  removePhotoLabels,
} from './product-form-translation-helpers';
import type {
  FormErrors,
  FormState,
  LocaleTranslationState,
  ProductPhotoBucket,
  SupportedLocale,
} from './product-form-types';

interface ProductFormFieldsOptions {
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
}

export function useProductFormFields({
  setForm,
  setErrors,
}: ProductFormFieldsOptions) {
  const updateField = useCallback(
    <K extends keyof Pick<FormState, 'price' | 'customizationConfig'>>(
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
    },
    [setErrors, setForm],
  );

  const updateLocale = useCallback(
    (activeLocale: SupportedLocale) => {
      setForm((current) => ({ ...current, activeLocale }));
    },
    [setForm],
  );

  const updateTranslation = useCallback(
    (patch: Partial<LocaleTranslationState>) => {
      setForm((current) => {
        const activeLocale = current.activeLocale;
        return {
          ...current,
          translations: {
            ...current.translations,
            [activeLocale]: normalizeTranslationDraft(activeLocale, {
              ...current.translations[activeLocale],
              ...patch,
              locale: activeLocale,
            }),
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
    },
    [setErrors, setForm],
  );

  const updatePhoto = useCallback(
    (
      bucket: ProductPhotoBucket,
      photoId: string,
      patch: Partial<ProductPhotoDraft>,
    ) => {
      setForm((current) => ({
        ...current,
        images: updateBucketPhoto(current.images, bucket, photoId, patch),
      }));
    },
    [setForm],
  );

  const updatePhotoLabel = useCallback(
    (photoId: string, label: string) => {
      setForm((current) => ({
        ...current,
        translations: {
          ...current.translations,
          [current.activeLocale]: {
            ...current.translations[current.activeLocale],
            photoLabels: {
              ...current.translations[current.activeLocale].photoLabels,
              [photoId]: label,
            },
          },
        },
      }));
    },
    [setForm],
  );

  const removePhoto = useCallback(
    (bucket: ProductPhotoBucket, photoId: string) => {
      setForm((current) => {
        const images = removeBucketPhoto(current.images, bucket, photoId);
        return {
          ...current,
          images,
          translations:
            bucket === 'customizableBase'
              ? removePhotoLabels(current.translations, photoId)
              : current.translations,
          selectedPhotoId:
            current.selectedPhotoId === photoId
              ? (images.cover?.id ??
                images.showcase[0]?.id ??
                images.customizableBase[0]?.id ??
                null)
              : current.selectedPhotoId,
        };
      });
    },
    [setForm],
  );

  const selectPhoto = useCallback(
    (selectedPhotoId: string) => {
      setForm((current) => ({ ...current, selectedPhotoId }));
    },
    [setForm],
  );

  const movePhoto = useCallback(
    (bucket: ProductPhotoBucket, photoId: string, direction: -1 | 1) => {
      if (bucket === 'cover') return;
      setForm((current) => ({
        ...current,
        images: {
          ...current.images,
          [bucket]: moveItem(current.images[bucket], photoId, direction),
        },
      }));
    },
    [setForm],
  );

  return {
    updateField,
    updateLocale,
    updateTranslation,
    updatePhoto,
    updatePhotoLabel,
    removePhoto,
    selectPhoto,
    movePhoto,
  };
}
