import { useCallback } from 'react';
import { addPhotoLabels } from './product-form-translation-helpers';
import {
  defaultPhotoName,
  purposeForBucket,
} from './product-form-image-helpers';
import type {
  FormState,
  ProductFormProps,
  ProductPhotoBucket,
} from './product-form-types';
import { uploadProductPhoto } from './product-form-upload';

interface ProductFormPhotosOptions {
  form: FormState;
  labels: ProductFormProps['labels'];
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  setPhotoError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useProductFormPhotos({
  form,
  labels,
  setForm,
  setUploading,
  setPhotoError,
}: ProductFormPhotosOptions) {
  const handleUpload = useCallback(
    async (bucket: ProductPhotoBucket, files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      setPhotoError(null);
      try {
        const existingCount =
          bucket === 'cover' ? 0 : form.images[bucket].length;
        const uploads = await Promise.all(
          files.map((file, index) =>
            uploadProductPhoto(
              file,
              defaultPhotoName(labels, existingCount + index),
              purposeForBucket(bucket),
            ),
          ),
        );
        setForm((current) => {
          const images =
            bucket === 'cover'
              ? { ...current.images, cover: uploads[0] ?? current.images.cover }
              : {
                  ...current.images,
                  [bucket]: [...current.images[bucket], ...uploads],
                };
          return {
            ...current,
            images,
            translations:
              bucket === 'customizableBase'
                ? addPhotoLabels(
                    current.translations,
                    uploads.map((photo) => photo.id),
                  )
                : current.translations,
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
    },
    [form.images, labels, setForm, setPhotoError, setUploading],
  );

  return { handleUpload };
}
