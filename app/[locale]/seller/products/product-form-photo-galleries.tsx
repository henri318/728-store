import { ProductPhotoBucketGallery } from './product-photo-gallery';
import type { ProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import type { ProductFormController } from './use-product-form';
import styles from './product-form.module.css';

interface ProductFormPhotoGalleriesProps {
  controller: ProductFormController;
  labels: ProductFormLabels['gallery'];
}

export function ProductFormPhotoGalleries({
  controller,
  labels,
}: ProductFormPhotoGalleriesProps) {
  const { form } = controller;

  return (
    <>
      {controller.photoError ? (
        <p className={styles.error} role="alert">
          {controller.photoError}
        </p>
      ) : null}
      <div className={styles['gallery-stack']}>
        <ProductPhotoBucketGallery
          mode="single"
          labels={labels.buckets.cover}
          commonLabels={labels}
          photos={form.images.cover ? [form.images.cover] : []}
          selectedPhotoId={form.selectedPhotoId}
          accept="image/png,image/jpeg,image/webp"
          onFilesSelected={(files) => controller.handleUpload('cover', files)}
          onPhotoLabelChange={(photoId, alt) =>
            controller.updatePhoto('cover', photoId, { alt })
          }
          onSelectPhoto={controller.selectPhoto}
          onRemovePhoto={(photoId) => controller.removePhoto('cover', photoId)}
          uploading={controller.uploading}
          error={null}
        />
        <ProductPhotoBucketGallery
          mode="multiple"
          labels={labels.buckets.showcase}
          commonLabels={labels}
          photos={form.images.showcase}
          selectedPhotoId={form.selectedPhotoId}
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          onFilesSelected={(files) =>
            controller.handleUpload('showcase', files)
          }
          onPhotoLabelChange={(photoId, alt) =>
            controller.updatePhoto('showcase', photoId, { alt })
          }
          onSelectPhoto={controller.selectPhoto}
          onRemovePhoto={(photoId) =>
            controller.removePhoto('showcase', photoId)
          }
          onMovePhotoUp={(photoId) =>
            controller.movePhoto('showcase', photoId, -1)
          }
          onMovePhotoDown={(photoId) =>
            controller.movePhoto('showcase', photoId, 1)
          }
          onPosterUrlChange={(photoId, posterUrl) =>
            controller.updatePhoto('showcase', photoId, {
              posterUrl: posterUrl.trim() || null,
            })
          }
          uploading={controller.uploading}
          error={null}
        />
        <ProductPhotoBucketGallery
          mode="multiple"
          labels={labels.buckets.customizableBase}
          commonLabels={labels}
          photos={form.images.customizableBase}
          localizedPhotoLabels={
            form.translations[form.activeLocale].photoLabels
          }
          selectedPhotoId={form.selectedPhotoId}
          accept="image/png,image/jpeg,image/webp"
          onFilesSelected={(files) =>
            controller.handleUpload('customizableBase', files)
          }
          onPhotoLabelChange={controller.updatePhotoLabel}
          onSelectPhoto={controller.selectPhoto}
          onRemovePhoto={(photoId) =>
            controller.removePhoto('customizableBase', photoId)
          }
          onMovePhotoUp={(photoId) =>
            controller.movePhoto('customizableBase', photoId, -1)
          }
          onMovePhotoDown={(photoId) =>
            controller.movePhoto('customizableBase', photoId, 1)
          }
          uploading={controller.uploading}
          error={null}
        />
      </div>
    </>
  );
}
