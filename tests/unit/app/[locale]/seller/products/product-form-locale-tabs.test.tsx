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
      props as ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe('ProductForm locale tabs', () => {
  const labels = {
    title: 'Crear producto',
    backToProducts: 'Volver a productos',
    nameLabel: 'Nombre',
    descriptionLabel: 'Descripción',
    priceLabel: 'Precio',
    save: 'Guardar producto',
    saved: 'Guardado',
    error: 'No se pudo guardar el producto',
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

  it('switches locales and preserves independent values per tab', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          name: '',
          description: '',
          price: 1,
          translations: [
            {
              locale: 'es',
              name: 'Taza',
              description: 'Base',
              tags: ['hogar'],
              sizes: ['S'],
              designChangeDescription: 'Cambio ES',
            },
            {
              locale: 'cat',
              name: 'Tassa',
              description: 'Base cat',
              tags: ['llar'],
              sizes: ['M'],
              designChangeDescription: 'Canvi CAT',
            },
          ],
          customizationConfig: ProductCustomizationConfig.default().toJson(),
          images: [],
        }}
        labels={labels}
      />,
    );

    expect(screen.getByRole('tab', { name: 'ES' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Nombre')).toHaveValue('Taza');
    expect(screen.getByLabelText('Etiquetas')).toHaveValue('');
    expect(screen.getByText('hogar')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Etiquetas'), {
      target: { value: 'hogar-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));

    fireEvent.change(screen.getByLabelText('Tallas'), {
      target: { value: 'M' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla' }));

    expect(screen.getByText('hogar-2')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'CAT' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Tassa');
    expect(screen.getByLabelText('Etiquetas')).toHaveValue('');
    expect(screen.getByText('llar')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Etiquetas'), {
      target: { value: 'decoració' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));

    fireEvent.change(screen.getByLabelText('Tallas'), {
      target: { value: 'L' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla' }));

    expect(screen.getByText('decoració')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Tassa nova' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'ES' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Taza');
    expect(screen.getByText('hogar-2')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'CAT' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Tassa nova');
    expect(screen.getByText('decoració')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: labels.save }));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe('/api/products');
      const body = JSON.parse(String(lastCall?.[1]?.body));
      expect(body.translations).toHaveLength(2);
      expect(body.translations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            locale: 'es',
            name: 'Taza',
            description: 'Base',
            tags: ['hogar', 'hogar-2'],
            sizes: ['S', 'M'],
            designChangeDescription: 'Cambio ES',
          }),
          expect.objectContaining({
            locale: 'cat',
            name: 'Tassa nova',
            description: 'Base cat',
            tags: ['llar', 'decoració'],
            sizes: ['M', 'L'],
            designChangeDescription: 'Canvi CAT',
          }),
        ]),
      );
    });
  });
});
