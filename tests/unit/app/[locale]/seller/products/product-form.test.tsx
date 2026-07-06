import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductForm } from '@/app/[locale]/seller/products/product-form';

const fetchMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- stripping unoptimized prop
    const { unoptimized: _unoptimized, ...rest } =
      props as ImgHTMLAttributes<HTMLImageElement> & {
        unoptimized?: boolean;
      };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe('ProductForm', () => {
  const labels = {
    title: 'Crear producto',
    backToProducts: 'Volver a productos',
    nameLabel: 'Nombre',
    descriptionLabel: 'Descripción',
    priceLabel: 'Precio',
    save: 'Guardar producto',
    saved: 'Guardado',
    error: 'No se pudo guardar el producto',
    customization: {
      label: 'Configuración de personalización',
      hint: 'Ajusta la vista previa y los campos de personalización.',
      editor: {
        sizeOptionsLabel: 'Tallas disponibles',
        sizeOptionsPlaceholder: 'S, M, L',
        allowPhotoDesignLabel: 'Permitir diseño con foto',
        designChangeDescriptionLabel: 'Descripción del cambio de diseño',
        designChangeDescriptionPlaceholder: 'Describe los cambios...',
        categoryLabel: 'Categoría',
        categoryPlaceholder: 'Seleccionar categoría',
        tagsLabel: 'Etiquetas',
        tagsPlaceholder: 'etiqueta1, etiqueta2',
        tagsHelp: 'Separa las etiquetas por comas.',
        addLabel: 'Añadir',
      },
    },
    gallery: {
      title: 'Fotos del producto',
      hint: 'Sube variantes y nómbralas por color o acabado.',
      addPhotoLabel: 'Añadir fotos',
      photoDisplayNameLabel: 'Nombre visible',
      photoDisplayNamePlaceholder: 'Rojo cereza',
      selectForPreviewLabel: 'Usar en la vista previa',
      removePhotoLabel: 'Eliminar foto',
      uploadingLabel: 'Subiendo imagen...',
      emptyState: 'Aún no hay fotos',
      uploadError: 'No se pudo subir la foto',
      defaultPhotoName: 'Foto',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('uploads photos from the file selector, lets the designer name and choose a preview variant, and submits translated payloads', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init) => {
      const url = String(input);

      if (url.includes('/api/uploads/presigned-url')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          fileName: string;
        };
        return Response.json(
          {
            id: `${body.fileName}-upload`,
            uploadUrl: `https://uploads.example.com/${body.fileName}`,
            storageKey: `products/${body.fileName}`,
            publicUrl: `http://localhost:8081/products/${body.fileName}`,
          },
          { status: 201 },
        );
      }

      if (url.startsWith('https://uploads.example.com/')) {
        return new Response(null, { status: 200 });
      }

      if (url === '/api/products') {
        return Response.json({ id: 'p-1' }, { status: 201 });
      }

      return new Response(null, { status: 200 });
    });

    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          name: '',
          description: '',
          price: 1,
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
            sizeOptions: ['S', 'M', 'L'],
            textOffset: { x: 12, y: 18 },
            imageOffset: { x: 24, y: 40 },
          },
          images: [],
        }}
        labels={labels}
      />,
    );

    expect(screen.getAllByText(labels.title)).toHaveLength(1);
    expect(screen.getByLabelText(labels.nameLabel)).toBeTruthy();
    expect(screen.getByText(labels.gallery.title)).toBeTruthy();
    expect(screen.getByLabelText(labels.gallery.addPhotoLabel)).toBeTruthy();
    expect(screen.queryByLabelText('Estado')).toBeNull();

    fireEvent.change(screen.getByLabelText(labels.nameLabel), {
      target: { value: 'Taza personalizada' },
    });
    fireEvent.change(screen.getByLabelText(labels.descriptionLabel), {
      target: { value: 'Edición limitada' },
    });
    fireEvent.change(screen.getByLabelText(labels.priceLabel), {
      target: { value: '19.99' },
    });

    const fileInput = screen.getByLabelText(labels.gallery.addPhotoLabel);
    const firstFile = new File(['red'], 'mug-red.png', { type: 'image/png' });
    const secondFile = new File(['blue'], 'mug-blue.png', {
      type: 'image/png',
    });

    fireEvent.change(fileInput, {
      target: { files: [firstFile, secondFile] },
    });

    await waitFor(() => {
      expect(
        screen.getAllByLabelText(labels.gallery.photoDisplayNameLabel),
      ).toHaveLength(2);
    });

    fireEvent.change(
      screen.getAllByLabelText(labels.gallery.photoDisplayNameLabel)[0],
      {
        target: { value: 'Rojo cereza' },
      },
    );
    fireEvent.change(
      screen.getAllByLabelText(labels.gallery.photoDisplayNameLabel)[1],
      {
        target: { value: 'Azul niebla' },
      },
    );

    fireEvent.click(
      screen.getAllByRole('button', {
        name: labels.gallery.selectForPreviewLabel,
      })[1],
    );

    fireEvent.click(screen.getByRole('button', { name: labels.save }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'es',
          name: 'Taza personalizada',
          description: 'Edición limitada',
          price: 19.99,
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
            sizeOptions: ['S', 'M', 'L'],
            textOffset: { x: 12, y: 18 },
            imageOffset: { x: 24, y: 40 },
            designChangeDescription: null,
          },
          images: [
            {
              url: 'http://localhost:8081/products/mug-red.png',
              alt: 'Rojo cereza',
              position: 0,
            },
            {
              url: 'http://localhost:8081/products/mug-blue.png',
              alt: 'Azul niebla',
              position: 1,
            },
          ],
        }),
      });
    });
  });

  it('does not expose status editing in edit mode', () => {
    render(
      <ProductForm
        locale="es"
        mode="edit"
        productId="p-1"
        initialValues={{
          name: 'Taza',
          description: 'Base',
          price: 19.99,
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [
            {
              url: 'http://localhost:8081/products/taza.png',
              alt: 'Taza base',
            },
          ],
        }}
        labels={labels}
      />,
    );

    expect(screen.queryByLabelText('Estado')).toBeNull();
    expect(
      screen.getAllByText(labels.customization.label).length,
    ).toBeGreaterThan(0);
  });

  it('toggles the allow-photo-design checkbox in the customization editor', () => {
    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          name: 'Taza',
          description: 'Base',
          price: 19.99,
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
            sizeOptions: ['S', 'M', 'L'],
            textOffset: { x: 12, y: 18 },
            imageOffset: { x: 24, y: 40 },
          },
          images: [],
        }}
        labels={labels}
      />,
    );

    const checkbox = screen.getByLabelText(
      labels.customization.editor.allowPhotoDesignLabel,
    );

    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('renders the category field as a select when category options are provided', () => {
    render(
      <ProductForm
        locale="es"
        mode="create"
        categories={[
          { id: 'cat-1', name: 'Ropa' },
          { id: 'cat-2', name: 'Tazas' },
        ]}
        initialValues={{
          name: 'Taza',
          description: 'Base',
          price: 19.99,
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [],
        }}
        labels={labels}
      />,
    );

    const select = screen.getByLabelText(
      labels.customization.editor.categoryLabel,
    );

    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Ropa' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tazas' })).toBeInTheDocument();
  });

  it('does not submit legacy designPosition data from edit mode', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/products/p-1') {
        return Response.json({ id: 'p-1' }, { status: 200 });
      }

      return new Response(null, { status: 200 });
    });

    render(
      <ProductForm
        locale="es"
        mode="edit"
        productId="p-1"
        initialValues={{
          name: 'Taza',
          description: 'Base',
          price: 19.99,
          customizationConfig: {
            ...ProductCustomizationConfig.default().toJson(),
            designPosition: {
              imageUrl: 'http://localhost:8081/design.png',
              x: 0.5,
              y: 0.4,
              scale: 100,
              rotation_deg: 0,
              opacity: 90,
              blend_mode: 'multiply',
            },
          } as never,
          images: [],
        }}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: labels.save }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/products/p-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });

    const body = JSON.parse(
      String(fetchMock.mock.calls.at(-1)?.[1]?.body ?? '{}'),
    ) as { customizationConfig?: Record<string, unknown> };

    expect(body.customizationConfig).not.toHaveProperty('designPosition');
  });

  it('uploads a photo and displays it in the photo gallery', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/uploads/presigned-url')) {
        return Response.json(
          {
            id: 'photo-upload',
            uploadUrl: 'https://uploads.example.com/photo.png',
            storageKey: 'products/photo.png',
            publicUrl: 'http://localhost:8081/products/photo.png',
          },
          { status: 201 },
        );
      }

      if (url.startsWith('https://uploads.example.com/')) {
        return new Response(null, { status: 200 });
      }

      return new Response(null, { status: 200 });
    });

    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          name: 'Taza',
          description: 'Base',
          price: 19.99,
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
            sizeOptions: ['S', 'M', 'L'],
            textOffset: { x: 12, y: 18 },
            imageOffset: { x: 24, y: 40 },
          },
          images: [],
        }}
        labels={labels}
      />,
    );

    const fileInput = screen.getByLabelText(labels.gallery.addPhotoLabel);
    const file = new File(['photo'], 'mug-blue.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByRole('img', { name: /mug blue/i });
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toContain('/products/photo.png');
    });
  });
});
