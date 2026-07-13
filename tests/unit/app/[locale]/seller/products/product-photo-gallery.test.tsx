import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import {
  ProductPhotoBucketGallery,
  type ProductPhotoDraft,
} from '@/app/[locale]/seller/products/product-photo-gallery';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- stripping unoptimized prop
    const { unoptimized: _unoptimized, ...rest } =
      props as ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('ProductPhotoBucketGallery', () => {
  const commonLabels = {
    photoDisplayNameLabel: 'Nombre visible',
    photoDisplayNamePlaceholder: 'Rojo cereza',
    selectForPreviewLabel: 'Usar en la vista previa',
    removePhotoLabel: 'Eliminar foto',
    moveUpLabel: 'Subir',
    moveDownLabel: 'Bajar',
    uploadingLabel: 'Subiendo imagen...',
    uploadError: 'No se pudo subir la foto',
    defaultPhotoName: 'Foto',
  };

  const labels = {
    title: 'Fotos del producto',
    hint: 'Sube variantes y nómbralas por color o acabado.',
    addPhotoLabel: 'Añadir fotos',
    emptyState: 'Aún no hay fotos',
    noCoverPlaceholder: 'No cover image set',
    posterLabel: 'Póster opcional',
    posterPlaceholder: 'https://cdn.example.com/poster.jpg',
  };

  const photo: ProductPhotoDraft = {
    id: 'photo-1',
    url: 'http://localhost:8081/products/photo-1.png',
    alt: 'Rojo cereza',
    size: 1024,
    purpose: ProductImagePurpose.SHOWCASE,
    mimeType: 'image/png',
    posterUrl: null,
  };

  it.each([
    ['single', [photo] as ProductPhotoDraft[]],
    [
      'multiple',
      [
        photo,
        {
          ...photo,
          id: 'photo-2',
          alt: 'Azul niebla',
          url: 'http://localhost:8081/products/photo-2.png',
        },
      ] as ProductPhotoDraft[],
    ],
  ] as const)(
    'renders the preview-selection button role in %s mode',
    (mode, photos) => {
      render(
        <ProductPhotoBucketGallery
          mode={mode}
          labels={labels}
          commonLabels={commonLabels}
          photos={photos}
          selectedPhotoId={null}
          accept="image/png"
          onFilesSelected={vi.fn().mockResolvedValue(undefined)}
          onPhotoLabelChange={vi.fn()}
          onSelectPhoto={vi.fn()}
          onRemovePhoto={vi.fn()}
          onMovePhotoUp={mode === 'multiple' ? vi.fn() : undefined}
          onMovePhotoDown={mode === 'multiple' ? vi.fn() : undefined}
          onPosterUrlChange={undefined}
          uploading={false}
          error={null}
        />,
      );

      expect(
        screen.getAllByRole('button', {
          name: commonLabels.selectForPreviewLabel,
        }),
      ).toHaveLength(photos.length);
    },
  );

  it('keeps the photo preview area selectable without a visible button label', () => {
    const onSelectPhoto = vi.fn();

    render(
      <ProductPhotoBucketGallery
        mode="single"
        labels={labels}
        commonLabels={commonLabels}
        photos={[photo]}
        selectedPhotoId={null}
        accept="image/png"
        onFilesSelected={vi.fn().mockResolvedValue(undefined)}
        onPhotoLabelChange={vi.fn()}
        onSelectPhoto={onSelectPhoto}
        onRemovePhoto={vi.fn()}
        uploading={false}
        error={null}
      />,
    );

    fireEvent.click(
      screen.getAllByRole('button', {
        name: commonLabels.selectForPreviewLabel,
      })[0],
    );

    expect(
      screen.getByRole('button', {
        name: commonLabels.selectForPreviewLabel,
      }),
    ).toBeTruthy();
    expect(onSelectPhoto).toHaveBeenCalledWith(photo.id);
  });

  it('renders and edits the active locale label without changing the shared photo alt', () => {
    const onPhotoLabelChange = vi.fn();

    const { rerender } = render(
      <ProductPhotoBucketGallery
        mode="multiple"
        labels={labels}
        commonLabels={commonLabels}
        photos={[{ ...photo, purpose: ProductImagePurpose.CUSTOMIZABLE_BASE }]}
        localizedPhotoLabels={{ 'photo-1': 'Frontal ES' }}
        selectedPhotoId={null}
        accept="image/png"
        onFilesSelected={vi.fn().mockResolvedValue(undefined)}
        onPhotoLabelChange={onPhotoLabelChange}
        onSelectPhoto={vi.fn()}
        onRemovePhoto={vi.fn()}
        onMovePhotoUp={vi.fn()}
        onMovePhotoDown={vi.fn()}
        uploading={false}
        error={null}
      />,
    );

    const input = screen.getByLabelText(commonLabels.photoDisplayNameLabel);
    expect(input).toHaveValue('Frontal ES');
    fireEvent.change(input, { target: { value: 'Frontal editado' } });
    expect(onPhotoLabelChange).toHaveBeenCalledWith(
      'photo-1',
      'Frontal editado',
    );

    rerender(
      <ProductPhotoBucketGallery
        mode="multiple"
        labels={labels}
        commonLabels={commonLabels}
        photos={[{ ...photo, purpose: ProductImagePurpose.CUSTOMIZABLE_BASE }]}
        localizedPhotoLabels={{ 'photo-1': 'Frontal CAT' }}
        selectedPhotoId={null}
        accept="image/png"
        onFilesSelected={vi.fn().mockResolvedValue(undefined)}
        onPhotoLabelChange={onPhotoLabelChange}
        onSelectPhoto={vi.fn()}
        onRemovePhoto={vi.fn()}
        onMovePhotoUp={vi.fn()}
        onMovePhotoDown={vi.fn()}
        uploading={false}
        error={null}
      />,
    );

    expect(
      screen.getByLabelText(commonLabels.photoDisplayNameLabel),
    ).toHaveValue('Frontal CAT');
    expect(screen.getByAltText(photo.alt)).toBeInTheDocument();
  });
});
