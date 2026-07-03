import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductForm } from '@/app/[locale]/seller/products/product-form';

const fetchMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
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
        modeLabel: 'Modo de personalización',
        modeDescription: 'Solo descripción',
        modeText: 'Texto',
        modePhoto: 'Foto',
        modeTextPhoto: 'Texto + foto',
        previewEnabledLabel: 'Activar vista previa',
        previewTemplateUrlLabel: 'Subir plantilla de vista previa',
        sizeOptionsLabel: 'Tallas disponibles',
        sizeOptionsPlaceholder: 'S, M, L',
        textOffsetTitle: 'Desplazamiento del texto',
        imageOffsetTitle: 'Desplazamiento de la imagen',
        offsetXLabel: 'X',
        offsetYLabel: 'Y',
        offsetRotateLabel: 'Rotación',
        offsetScaleLabel: 'Escala',
        offsetMaxWidthLabel: 'Ancho máximo',
        descriptionOnlyLabel: 'Descripción sin vista previa',
        previewTemplateHelp:
          'La plantilla se superpone sobre la foto base en la vista previa.',
        previewTemplateRemoveLabel: 'Eliminar plantilla',
        uploadingLabel: 'Subiendo imagen...',
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
    preview: {
      title: 'Vista previa',
      hint: 'La variante seleccionada se muestra en el mockup.',
      selectedLabel: 'Variante seleccionada',
      fallback: 'Selecciona una foto para ver el mockup.',
      previewLabels: {
        customizationPreview: 'Vista previa de personalización',
        customizationPreviewDisclaimer:
          'La vista previa es orientativa y puede variar en producción.',
        customizationPreviewUnavailable: 'Vista previa no disponible',
        customizationLimitedToDescription:
          'La personalización se limita a la descripción.',
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
        return new Response(
          JSON.stringify({
            id: `${body.fileName}-upload`,
            uploadUrl: `https://uploads.example.com/${body.fileName}`,
            storageKey: `products/${body.fileName}`,
            publicUrl: `http://localhost:8081/products/${body.fileName}`,
          }),
          { status: 201 },
        );
      }

      if (url.startsWith('https://uploads.example.com/')) {
        return new Response(null, { status: 200 });
      }

      if (url === '/api/products') {
        return new Response(JSON.stringify({ id: 'p-1' }), { status: 201 });
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

    expect(screen.getAllByText(labels.title)).toHaveLength(2);
    expect(screen.getByLabelText(labels.nameLabel)).toBeTruthy();
    expect(screen.getByText(labels.gallery.title)).toBeTruthy();
    expect(screen.getByLabelText(labels.gallery.addPhotoLabel)).toBeTruthy();
    expect(
      screen.getByLabelText(labels.customization.editor.modeLabel),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(labels.customization.editor.descriptionOnlyLabel),
    ).toBeTruthy();
    expect(screen.getByText(labels.preview.title)).toBeTruthy();
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

    await waitFor(() => {
      const preview = screen.getByRole('img', {
        name: labels.preview.previewLabels.customizationPreview,
      }) as HTMLImageElement;

      expect(preview.src).toContain('/products/mug-blue.png');
      expect(screen.getByText(/Variante seleccionada/)).toBeTruthy();
      expect(
        screen.getByText('Azul niebla', { selector: 'strong' }),
      ).toBeTruthy();
    });

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
      screen.queryByText(labels.customization.editor.modeLabel),
    ).toBeTruthy();
    expect(screen.getByText(labels.preview.title)).toBeTruthy();
  });

  it('switches the customization editor to description-only mode and hides preview controls', () => {
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

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: labels.customization.editor.descriptionOnlyLabel,
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: labels.customization.editor.descriptionOnlyLabel,
      }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: labels.customization.editor.previewEnabledLabel,
      }),
    ).toBeDisabled();
    expect(
      screen.queryByText(labels.customization.editor.previewTemplateHelp),
    ).toBeNull();
    expect(
      screen.queryByText(labels.customization.editor.textOffsetTitle),
    ).toBeNull();
    expect(
      screen.queryByText(labels.customization.editor.imageOffsetTitle),
    ).toBeNull();
  });

  it('layers the uploaded preview template over the selected product photo in the live edit preview and applies image offset changes', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init) => {
      const url = String(input);

      if (url.includes('/api/uploads/presigned-url')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          fileName: string;
        };
        return new Response(
          JSON.stringify({
            id: `${body.fileName}-template-upload`,
            uploadUrl: `https://uploads.example.com/${body.fileName}`,
            storageKey: `products/${body.fileName}`,
            publicUrl: `http://localhost:8081/products/${body.fileName}`,
          }),
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
        mode="edit"
        productId="p-1"
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

    const templateFile = new File(['mockup'], 'mockup.png', {
      type: 'image/png',
    });

    const templateInput = screen
      .getAllByLabelText(labels.customization.editor.previewTemplateUrlLabel)
      .find((element) => element.tagName === 'INPUT') as HTMLInputElement;

    fireEvent.change(templateInput, {
      target: { files: [templateFile] },
    });

    await waitFor(() => {
      const preview = screen.getByRole('img', {
        name: labels.preview.previewLabels.customizationPreview,
      }) as HTMLImageElement;
      const previewFigure = preview.closest('figure');
      expect(previewFigure).toBeTruthy();
      const previewImages = previewFigure!.querySelectorAll('img');

      expect(previewImages).toHaveLength(2);
      expect(previewImages[0].src).toContain('/products/taza.png');
      expect(previewImages[1].src).toContain('/products/mockup.png');
      expect(previewImages[1].style.left).toBe('24px');
      expect(previewImages[1].style.top).toBe('40px');
    });

    const imageOffsetGroup = screen.getByRole('group', {
      name: labels.customization.editor.imageOffsetTitle,
    });

    fireEvent.change(
      within(imageOffsetGroup).getByLabelText(
        labels.customization.editor.offsetXLabel,
      ),
      {
        target: { value: '48' },
      },
    );

    await waitFor(() => {
      const preview = screen.getByRole('img', {
        name: labels.preview.previewLabels.customizationPreview,
      }) as HTMLImageElement;
      const previewFigure = preview.closest('figure');
      expect(previewFigure).toBeTruthy();
      const previewImages = previewFigure!.querySelectorAll('img');

      expect(previewImages[1].style.left).toBe('48px');
      expect(previewImages[1].style.top).toBe('40px');
    });
  });
});
