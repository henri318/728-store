'use client';

import Image from 'next/image';
import { FileUploadDropzone } from '@/shared/ui/file-upload-dropzone';
import styles from './product-form.module.css';

export interface ProductPhotoDraft {
  id: string;
  url: string;
  alt: string;
  size?: number | null;
  previewSelected: boolean;
}

interface ProductPhotoGalleryLabels {
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
}

interface ProductPhotoGalleryProps {
  photos: ProductPhotoDraft[];
  selectedPhotoId: string | null;
  labels: ProductPhotoGalleryLabels;
  onFilesSelected: (files: File[]) => Promise<void>;
  onPhotoLabelChange: (photoId: string, alt: string) => void;
  onSelectPhoto: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  uploading: boolean;
  error: string | null;
}

export function ProductPhotoGallery({
  photos,
  selectedPhotoId,
  labels,
  onFilesSelected,
  onPhotoLabelChange,
  onSelectPhoto,
  onRemovePhoto,
  uploading,
  error,
}: ProductPhotoGalleryProps) {
  return (
    <div className={styles.gallery}>
      <FileUploadDropzone
        title={labels.title}
        helpText={labels.hint}
        buttonLabel={labels.addPhotoLabel}
        removeLabel={labels.removePhotoLabel}
        items={photos.map((photo) => ({
          id: photo.id,
          name: photo.alt,
          size: photo.size ?? null,
        }))}
        multiple
        accept="image/png,image/jpeg"
        variant="full"
        busy={uploading}
        busyLabel={labels.uploadingLabel}
        selectedItemId={selectedPhotoId}
        onFilesSelected={onFilesSelected}
        onRemoveItem={onRemovePhoto}
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      {photos.length === 0 ? (
        <p className={styles.emptyState}>{labels.emptyState}</p>
      ) : (
        <ul className={styles.galleryGrid}>
          {photos.map((photo, index) => {
            const isSelected = selectedPhotoId === photo.id;

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
                  {labels.selectForPreviewLabel}
                </button>

                <div className={styles.photoFrame}>
                  <Image
                    src={photo.url}
                    alt={photo.alt}
                    width={320}
                    height={240}
                    unoptimized
                    className={styles.photoImage}
                  />
                </div>

                <label className={styles.field}>
                  <span>{labels.photoDisplayNameLabel}</span>
                  <input
                    className={styles.input}
                    value={photo.alt}
                    placeholder={labels.photoDisplayNamePlaceholder}
                    required
                    onChange={(event) =>
                      onPhotoLabelChange(photo.id, event.target.value)
                    }
                  />
                </label>

                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => onSelectPhoto(photo.id)}
                  >
                    {labels.selectForPreviewLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.ghostButtonDanger}
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    {labels.removePhotoLabel}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
