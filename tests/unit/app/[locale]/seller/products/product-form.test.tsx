import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductForm } from '@/app/[locale]/seller/products/product-form';

const fetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('ProductForm', () => {
  const labels = {
    title: 'Create product',
    backToProducts: 'Back to products',
    nameLabel: 'Name',
    descriptionLabel: 'Description',
    priceLabel: 'Price',
    statusLabel: 'Status',
    customizationConfigLabel: 'Customization config',
    customizationConfigHint: 'Paste the JSON config here.',
    save: 'Save product',
    saved: 'Saved',
    error: 'Unable to save product',
    statusDraft: 'Draft',
    statusActive: 'Active',
    statusArchived: 'Archived',
    statusEliminated: 'Eliminated',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('submits a POST request for a new product', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'p-1' }),
    } as Response);

    render(
      <ProductForm
        locale="es"
        mode="create"
        initialValues={{
          name: '',
          description: '',
          price: 1,
          status: ProductStatus.DRAFT,
          customizationConfig: '',
        }}
        labels={labels}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Camiseta' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Diseño personalizable' },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '19.99' },
    });
    fireEvent.change(screen.getByLabelText('Customization config'), {
      target: {
        value: JSON.stringify({
          mode: 'text_photo',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/shirt.png',
          textOffset: { x: 10, y: 12 },
          imageOffset: { x: 20, y: 24 },
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'es',
          name: 'Camiseta',
          description: 'Diseño personalizable',
          price: 19.99,
          status: ProductStatus.DRAFT,
          customizationConfig: {
            mode: 'text_photo',
            previewEnabled: true,
            previewTemplateUrl: 'https://cdn.example.com/shirt.png',
            textOffset: { x: 10, y: 12 },
            imageOffset: { x: 20, y: 24 },
          },
        }),
      });
    });
  });

  it('submits a PATCH request for an existing product', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'p-1' }),
    } as Response);

    render(
      <ProductForm
        locale="es"
        mode="edit"
        productId="p-1"
        initialValues={{
          name: 'Camiseta',
          description: 'Base',
          price: 19.99,
          status: ProductStatus.ACTIVE,
          customizationConfig: JSON.stringify({
            mode: 'text',
            previewEnabled: true,
            previewTemplateUrl: 'https://cdn.example.com/shirt.png',
            textOffset: { x: 8, y: 10 },
            imageOffset: null,
          }),
        }}
        labels={labels}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Camiseta actualizada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products/p-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'es',
          name: 'Camiseta actualizada',
          description: 'Base',
          price: 19.99,
          status: ProductStatus.ACTIVE,
          customizationConfig: {
            mode: 'text',
            previewEnabled: true,
            previewTemplateUrl: 'https://cdn.example.com/shirt.png',
            textOffset: { x: 8, y: 10 },
            imageOffset: null,
          },
        }),
      });
    });
  });
});
