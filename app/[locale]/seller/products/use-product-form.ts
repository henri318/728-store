import { useMemo, useState } from 'react';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import {
  cleanPhotoLabels,
  buildTranslationMap,
  normalizeLocale,
} from './product-form-translation-helpers';
import {
  normalizeInitialImages,
  photoIdsFor,
} from './product-form-image-helpers';
import { useProductFormFields } from './use-product-form-fields';
import { useProductFormPhotos } from './use-product-form-photos';
import { useProductFormSubmission } from './use-product-form-submission';
import type {
  FormErrors,
  FormState,
  LocaleTranslationState,
  ProductFormProps,
  ProductPhotoBucket,
  SupportedLocale,
  TranslationMap,
} from './product-form-types';
import type { ProductPhotoDraft } from './product-photo-gallery';

export interface ProductFormController {
  form: FormState;
  errors: FormErrors;
  loading: boolean;
  uploading: boolean;
  saved: string | null;
  serverError: string | null;
  photoError: string | null;
  unsavedGuard: React.ReactNode;
  updateField: <
    K extends keyof Pick<FormState, 'price' | 'customizationConfig'>,
  >(
    field: K,
    value: FormState[K],
  ) => void;
  updateLocale: (locale: SupportedLocale) => void;
  updateTranslation: (patch: Partial<LocaleTranslationState>) => void;
  updatePhoto: (
    bucket: ProductPhotoBucket,
    photoId: string,
    patch: Partial<ProductPhotoDraft>,
  ) => void;
  updatePhotoLabel: (photoId: string, label: string) => void;
  removePhoto: (bucket: ProductPhotoBucket, photoId: string) => void;
  selectPhoto: (photoId: string) => void;
  movePhoto: (
    bucket: ProductPhotoBucket,
    photoId: string,
    direction: -1 | 1,
  ) => void;
  handleUpload: (bucket: ProductPhotoBucket, files: File[]) => Promise<void>;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useProductForm(props: ProductFormProps): ProductFormController {
  const { locale, mode, productId, initialValues, labels } = props;
  const initialLocale = normalizeLocale(locale);
  const [form, setForm] = useState<FormState>(() => {
    const images = normalizeInitialImages(labels, initialValues.images);
    const photoIds = photoIdsFor(images);
    const translations = Object.fromEntries(
      Object.entries(buildTranslationMap(initialLocale, initialValues)).map(
        ([translationLocale, translation]) => [
          translationLocale,
          {
            ...translation,
            photoLabels: cleanPhotoLabels(translation.photoLabels, photoIds),
          },
        ],
      ),
    ) as TranslationMap;
    return {
      price: String(initialValues.price),
      activeLocale: initialLocale,
      translations,
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
  const initialFormSnapshot = useMemo(
    () =>
      JSON.stringify({
        price: String(initialValues.price),
        translations: buildTranslationMap(initialLocale, initialValues),
        customizationConfig: initialValues.customizationConfig,
        images: normalizeInitialImages(labels, initialValues.images),
      }),
    [initialLocale, initialValues, labels],
  );
  const unsavedGuard = useUnsavedChangesGuard(
    mode === 'edit' &&
      JSON.stringify({
        price: form.price,
        translations: form.translations,
        customizationConfig: form.customizationConfig,
        images: form.images,
      }) !== initialFormSnapshot,
    labels.unsavedChanges ?? {
      title: 'Unsaved changes',
      message: 'You have unsaved changes. Leave this page?',
      leave: 'Leave',
      stay: 'Stay',
    },
  );
  const fields = useProductFormFields({ setForm, setErrors });
  const { handleUpload } = useProductFormPhotos({
    form,
    labels,
    setForm,
    setUploading,
    setPhotoError,
  });
  const { handleSubmit } = useProductFormSubmission({
    locale,
    mode,
    productId,
    form,
    labels,
    setForm,
    setErrors,
    setLoading,
    setSaved,
    setServerError,
  });

  return {
    form,
    errors,
    loading,
    uploading,
    saved,
    serverError,
    photoError,
    unsavedGuard,
    ...fields,
    handleUpload,
    handleSubmit,
  };
}
