'use client';

import Image from 'next/image';
import { FileUploadDropzone } from '@/shared/ui/file-upload-dropzone';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { isVideoMimeType } from '@/modules/uploads/domain/value-objects/mime-type';
import styles from './product-form.module.css';

export interface ProductPhotoDraft {
  id: string;
  url: string;
  alt: string;
  size?: number | null;
  purpose: ProductImagePurpose;
  mimeType: string;
  posterUrl: string | null;
}

interface ProductPhotoBucketGalleryLabels {
  title: string;
  hint: string;
  addPhotoLabel: string;
  emptyState: string;
  noCoverPlaceholder?: string;
  posterLabel?: string;
  posterPlaceholder?: string;
}

interface ProductPhotoCommonLabels {
  photoDisplayNameLabel: string;
  photoDisplayNamePlaceholder: string;
  selectForPreviewLabel: string;
  removePhotoLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  uploadingLabel: string;
  uploadError: string;
  defaultPhotoName: string;
}

function getSingleEmptyLabel(labels: ProductPhotoBucketGalleryLabels) {
  return labels.noCoverPlaceholder ?? labels.emptyState;
}

interface ProductPhotoBucketGalleryProps {
  mode: 'single' | 'multiple';
  labels: ProductPhotoBucketGalleryLabels;
  commonLabels: ProductPhotoCommonLabels;
  photos: ProductPhotoDraft[];
  selectedPhotoId: string | null;
  accept: string;
  onFilesSelected: (files: File[]) => Promise<void>;
  onPhotoLabelChange: (photoId: string, alt: string) => void;
  onSelectPhoto: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onMovePhotoUp?: (photoId: string) => void;
  onMovePhotoDown?: (photoId: string) => void;
  onPosterUrlChange?: (photoId: string, posterUrl: string) => void;
  uploading: boolean;
  error: string | null;
}

export function ProductPhotoBucketGallery({
  mode,
  labels,
  commonLabels,
  photos,
  selectedPhotoId,
  accept,
  onFilesSelected,
  onPhotoLabelChange,
  onSelectPhoto,
  onRemovePhoto,
  onMovePhotoUp,
  onMovePhotoDown,
  onPosterUrlChange,
  uploading,
  error,
}: ProductPhotoBucketGalleryProps) {
  const emptyLabel =
    mode === 'single' ? getSingleEmptyLabel(labels) : labels.emptyState;

  return (
    <section className={styles.bucket} aria-label={labels.title}>
      <FileUploadDropzone
        title={labels.title}
        helpText={labels.hint}
        buttonLabel={labels.addPhotoLabel}
        removeLabel={commonLabels.removePhotoLabel}
        items={photos.map((photo) => ({
          id: photo.id,
          name: photo.alt,
          size: photo.size ?? null,
        }))}
        multiple={mode === 'multiple'}
        accept={accept}
        variant="compact"
        busy={uploading}
        busyLabel={commonLabels.uploadingLabel}
        emptyLabel={emptyLabel}
        selectedItemId={selectedPhotoId}
        onFilesSelected={onFilesSelected}
        onRemoveItem={onRemovePhoto}
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      {photos.length === 0 ? null : (
        <ul className={styles.galleryGrid}>
          {photos.map((photo, index) => {
            const isSelected = selectedPhotoId === photo.id;
            const video = isVideoMimeType(photo.mimeType);

            return (
              <li
                key={photo.id}
                className={`${styles.photoCard} ${isSelected ? styles.photoCardSelected : ''}`}
              >
                <button
                  type="button"
                  className={styles.photoSelect}
                  onClick={() => onSelectPhoto(photo.id)}
                >
                  <span className={styles.photoIndex}>{index + 1}</span>
                  {commonLabels.selectForPreviewLabel}
                </button>

                <div className={styles.photoFrame}>
                  {video ? (
                    <video
                      controls
                      preload="metadata"
                      poster={photo.posterUrl ?? undefined}
                      className={styles.photoImage}
                    >
                      <source src={photo.url} type={photo.mimeType} />
                    </video>
                  ) : (
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      width={320}
                      height={240}
                      unoptimized
                      className={styles.photoImage}
                    />
                  )}
                </div>

                <label className={styles.field}>
                  <span>{commonLabels.photoDisplayNameLabel}</span>
                  <input
                    className={styles.input}
                    value={photo.alt}
                    placeholder={commonLabels.photoDisplayNamePlaceholder}
                    required
                    onChange={(event) =>
                      onPhotoLabelChange(photo.id, event.target.value)
                    }
                  />
                </label>

                {video && onPosterUrlChange && labels.posterLabel ? (
                  <label className={styles.field}>
                    <span>{labels.posterLabel}</span>
                    <input
                      className={styles.input}
                      value={photo.posterUrl ?? ''}
                      placeholder={labels.posterPlaceholder}
                      onChange={(event) =>
                        onPosterUrlChange(photo.id, event.target.value)
                      }
                    />
                  </label>
                ) : null}

                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => onSelectPhoto(photo.id)}
                  >
                    {commonLabels.selectForPreviewLabel}
                  </button>

                  {mode === 'multiple' && onMovePhotoUp && onMovePhotoDown ? (
                    <>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => onMovePhotoUp(photo.id)}
                      >
                        {commonLabels.moveUpLabel}
                      </button>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => onMovePhotoDown(photo.id)}
                      >
                        {commonLabels.moveDownLabel}
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    className={styles.ghostButtonDanger}
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    {commonLabels.removePhotoLabel}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
