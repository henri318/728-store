import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartView } from '@/app/[locale]/cart/cart-view';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
  usePathname: vi.fn(() => '/es/cart'),
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: [],
    itemCount: 0,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

describe('CartView', () => {
  const labels = {
    title: 'Tu carrito',
    emptyTitle: 'Tu carrito está vacío',
    emptyDescription:
      'Explora nuestros productos y encuentra algo que te encante.',
    browseProducts: 'Explorar productos',
    soldBy: 'Vendido por',
    remove: 'Eliminar',
    subtotal: 'Subtotal',
    checkout: 'Finalizar compra',
    unknownProduct: 'Producto desconocido',
    unknownSeller: 'Vendedor desconocido',
    customizationSize: 'Talla',
    customizationColor: 'Color',
    customizationText: 'Texto',
  };

  const baseItems = [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Test Product',
      productImageUrl: '/img/test.png',
      sellerId: 'seller-1',
      sellerName: 'Test Seller',
      quantity: 2,
      unitPrice: 10.0,
      lineTotal: 20.0,
      customization: {
        text: null,
        color: null,
        size: 'M',
        imageUrl: null,
      },
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      productName: 'Another Product',
      productImageUrl: null,
      sellerId: 'seller-2',
      sellerName: 'Another Seller',
      quantity: 1,
      unitPrice: 25.0,
      lineTotal: 25.0,
      customization: {
        text: 'Hello',
        color: 'Red',
        size: null,
        imageUrl: null,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart items with name, quantity, and line total', () => {
    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    expect(screen.getByText('Test Product')).toBeTruthy();
    expect(screen.getByText('Another Product')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('20.00 €')).toBeTruthy();
    expect(screen.getAllByText('25.00 €').length).toBe(2);
  });

  it('renders empty state with CTA when no items', () => {
    render(
      <CartView
        items={[]}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    expect(screen.getByText(labels.emptyTitle)).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/es/products');
  });

  it('renders subtotal', () => {
    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );
    expect(screen.getByText('45.00 €')).toBeTruthy();
  });

  it('renders checkout CTA linking to /{locale}/checkout', () => {
    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );
    const checkoutLink = screen.getByRole('link', { name: labels.checkout });
    expect(checkoutLink.getAttribute('href')).toBe('/es/checkout');
  });

  it('syncs authenticated cart items when server props change after refresh', () => {
    const { rerender } = render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    rerender(
      <CartView
        items={[
          ...baseItems,
          {
            id: 'item-3',
            productId: 'prod-3',
            productName: 'Merged Product',
            productImageUrl: null,
            sellerId: 'seller-3',
            sellerName: 'Merged Seller',
            quantity: 1,
            unitPrice: 15,
            lineTotal: 15,
            customization: {
              text: null,
              color: null,
              size: null,
              imageUrl: null,
            },
          },
        ]}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    expect(screen.getByText('Merged Product')).toBeTruthy();
    expect(screen.getByText('60.00 €')).toBeTruthy();
  });

  it('clicking "+" sends PATCH with quantity+1 and updates UI optimistically', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...baseItems[0], quantity: 3, lineTotal: 30 }),
    });

    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/cart/items/item-1',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );
  });

  it('clicking "-" sends PATCH with quantity-1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...baseItems[0], quantity: 1, lineTotal: 10 }),
    });

    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const minusButtons = screen.getAllByRole('button', { name: '−' });
    fireEvent.click(minusButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart/items/item-1',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });
  });

  it('clicking remove sends DELETE and removes the row', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const removeButtons = screen.getAllByRole('button', {
      name: labels.remove,
    });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/items/item-1', {
        method: 'DELETE',
      });
      expect(screen.queryByText('Test Product')).toBeNull();
      expect(screen.getByText('Another Product')).toBeTruthy();
    });
  });

  it('reverts optimistic update on PATCH failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    await waitFor(() => {
      const qtyDisplay = screen.getAllByText('2');
      expect(qtyDisplay.length).toBeGreaterThan(0);
    });
  });

  it('shows customization details when present', () => {
    render(
      <CartView
        items={baseItems}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );
    expect(screen.getByText(/Hello/i)).toBeTruthy();
    expect(screen.getByText(/Red/i)).toBeTruthy();
    expect(screen.getByText(/M/)).toBeTruthy();
  });
});
