import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
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
    submit: 'Guardar producto',
    saved: 'Guardado',
    error: 'No se pudo guardar el producto',
    missingTranslationNameError:
      'Completa el nombre traducido de {locale} antes de guardar.',
    localeTabs: { es: 'ES', cat: 'CAT' },
    translationSection: {
      title: 'Contenido traducido',
      hint: 'Edita cada idioma por separado.',
      nameLabel: 'Nombre',
      descriptionLabel: 'Descripción',
      tagsLabel: 'Etiquetas',
      tagsPlaceholder: 'ropa, verano',
      tagsAddLabel: 'Añadir etiqueta',
      tagsEmptyLabel: 'Aún no hay etiquetas',
      sizesLabel: 'Tallas',
      sizesPlaceholder: 'S, M, L',
      sizesAddLabel: 'Añadir talla',
      sizesEmptyLabel: 'Aún no hay tallas',
      designChangeDescriptionLabel: 'Descripción del cambio',
      designChangeDescriptionPlaceholder: 'Describe el cambio',
    },
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
      moveUpLabel: 'Subir',
      moveDownLabel: 'Bajar',
      uploadingLabel: 'Subiendo imagen...',
      emptyState: 'Aún no hay fotos',
      uploadError: 'No se pudo subir la foto',
      defaultPhotoName: 'Foto',
      buckets: {
        cover: {
          title: 'Portada',
          hint: 'Imagen principal del producto.',
          addPhotoLabel: 'Añadir portada',
          emptyState: 'Aún no hay portada',
          noCoverPlaceholder: 'No cover image set',
        },
        showcase: {
          title: 'Escaparate',
          hint: 'Imágenes y vídeos de apoyo.',
          addPhotoLabel: 'Añadir al escaparate',
          emptyState: 'Aún no hay escaparate',
          posterLabel: 'Póster opcional',
          posterPlaceholder: 'https://cdn.example.com/poster.jpg',
        },
        customizableBase: {
          title: 'Base personalizable',
          hint: 'Bases para personalización.',
          addPhotoLabel: 'Añadir base',
          emptyState: 'Aún no hay bases',
        },
      },
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
          price: 1,
          translations: [
            {
              locale: 'es',
              name: '',
              description: '',
              tags: ['ropa', 'verano'],
              sizes: ['S', 'M', 'L'],
              designChangeDescription: 'Cambia el estampado frontal',
            },
            {
              locale: 'cat',
              name: '',
              description: '',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
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
    expect(screen.getByText(labels.gallery.buckets.cover.title)).toBeTruthy();
    expect(
      screen.getByText(labels.gallery.buckets.showcase.title),
    ).toBeTruthy();
    expect(
      screen.getByText(labels.gallery.buckets.customizableBase.title),
    ).toBeTruthy();
    expect(
      screen.getByText(labels.gallery.buckets.cover.noCoverPlaceholder),
    ).toBeTruthy();
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

    const fileInput = screen.getByLabelText(
      labels.gallery.buckets.showcase.addPhotoLabel,
    );
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

    fireEvent.click(screen.getByRole('button', { name: labels.submit }));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe('/api/products');

      const body = JSON.parse(String(lastCall?.[1]?.body));
      expect(body).toMatchObject({
        locale: 'es',
        name: 'Taza personalizada',
        description: 'Edición limitada',
        price: 19.99,
        customizationConfig: {
          mode: 'text_photo',
          previewEnabled: true,
          previewTemplateUrl: null,
          textOffset: { x: 12, y: 18 },
          imageOffset: { x: 24, y: 40 },
        },
        translations: [
          {
            locale: 'es',
            name: 'Taza personalizada',
            description: 'Edición limitada',
            tags: ['ropa', 'verano'],
            sizes: ['S', 'M', 'L'],
            designChangeDescription: 'Cambia el estampado frontal',
          },
        ],
        images: [
          {
            url: 'http://localhost:8081/products/mug-red.png',
            alt: 'Rojo cereza',
            position: 0,
            purpose: ProductImagePurpose.SHOWCASE,
            mimeType: 'image/png',
            posterUrl: null,
          },
          {
            url: 'http://localhost:8081/products/mug-blue.png',
            alt: 'Azul niebla',
            position: 1,
            purpose: ProductImagePurpose.SHOWCASE,
            mimeType: 'image/png',
            posterUrl: null,
          },
        ],
      });
      expect(body.translations).toHaveLength(1);
      expect(body.translations[0]).toMatchObject({
        locale: 'es',
        name: 'Taza personalizada',
        description: 'Edición limitada',
        tags: ['ropa', 'verano'],
        sizes: ['S', 'M', 'L'],
        designChangeDescription: 'Cambia el estampado frontal',
      });
    });
  });

  it('normalizes whitespace-only translation design change descriptions in the submitted payload', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

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
          price: 1,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: '',
              tags: [],
              sizes: [],
              designChangeDescription: ' '.repeat(3),
            },
          ],
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [],
        }}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: labels.submit }));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe('/api/products');

      const body = JSON.parse(String(lastCall?.[1]?.body));
      expect(body.translation.designChangeDescription).toBeNull();
      expect(body.translations[0].designChangeDescription).toBeNull();
    });
  });

  it('does not expose status editing in edit mode', () => {
    render(
      <ProductForm
        locale="es"
        mode="edit"
        productId="p-1"
        initialValues={{
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
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
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
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

  it('includes translated tags and sizes in the edit-mode PATCH payload', async () => {
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
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: ['hogar'],
              sizes: ['S'],
              designChangeDescription: null,
            },
            {
              locale: 'cat',
              name: 'Tassa',
              description: 'Base cat',
              tags: ['llar'],
              sizes: ['M'],
              designChangeDescription: null,
            },
          ],
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [],
        }}
        labels={labels}
      />,
    );

    fireEvent.change(screen.getByLabelText('Etiquetas'), {
      target: { value: 'hogar premium' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));

    fireEvent.change(screen.getByLabelText('Tallas'), {
      target: { value: 'M' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla' }));

    fireEvent.click(screen.getByRole('tab', { name: 'CAT' }));

    fireEvent.change(screen.getByLabelText('Etiquetas'), {
      target: { value: 'regal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));

    fireEvent.change(screen.getByLabelText('Tallas'), {
      target: { value: 'L' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla' }));

    fireEvent.click(screen.getByRole('button', { name: labels.submit }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/products/p-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });

    const body = JSON.parse(
      String(fetchMock.mock.calls.at(-1)?.[1]?.body ?? '{}'),
    ) as {
      translations?: Array<{ locale: string; tags: string[]; sizes: string[] }>;
    };

    expect(body.translations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'es',
          tags: ['hogar', 'hogar premium'],
          sizes: ['S', 'M'],
        }),
        expect.objectContaining({
          locale: 'cat',
          tags: ['llar', 'regal'],
          sizes: ['M', 'L'],
        }),
      ]),
    );
  });

  it('switches to the locale with missing translated name and blocks submission', async () => {
    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
            {
              locale: 'cat',
              name: '',
              description: '',
              tags: ['llar'],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [],
        }}
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: labels.submit }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'CAT' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/products',
      expect.anything(),
    );
    expect(
      screen.getByText(
        labels.missingTranslationNameError.replace('{locale}', 'CAT'),
      ),
    ).toBeInTheDocument();
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
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
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
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
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

    fireEvent.click(screen.getByRole('button', { name: labels.submit }));

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
          price: 19.99,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: [],
              sizes: [],
              designChangeDescription: null,
            },
          ],
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: null,
            textOffset: { x: 12, y: 18 },
            imageOffset: { x: 24, y: 40 },
          },
          images: [],
        }}
        labels={labels}
      />,
    );

    const fileInput = screen.getByLabelText(
      labels.gallery.buckets.showcase.addPhotoLabel,
    );
    const file = new File(['photo'], 'mug-blue.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByRole('img', { name: /mug blue/i });
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toContain('/products/photo.png');
    });
  });
});
