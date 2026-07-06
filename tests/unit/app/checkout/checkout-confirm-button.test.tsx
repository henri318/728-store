import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutConfirmButton } from '@/modules/cart/presentation/components/checkout-confirm-button';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Mock guest cart context
const mockClearCart = vi.fn();
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    clearCart: mockClearCart,
    items: [],
    itemCount: 0,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

describe('CheckoutConfirmButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Realizar pedido" button', () => {
    render(<CheckoutConfirmButton locale="es" />);
    expect(
      screen.getByRole('button', { name: /realizar pedido/i }),
    ).toBeTruthy();
  });

  it('pre-fills the inline address form when an initial profile address exists', () => {
    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );

    expect(screen.getByLabelText(/calle/i)).toHaveValue('Main St 1');
    expect(screen.getByLabelText(/ciudad/i)).toHaveValue('Madrid');
    expect(screen.getByLabelText(/código postal/i)).toHaveValue('28001');
    expect(screen.getByLabelText(/país/i)).toHaveValue('ES');
  });

  it('shows an error and stops when the address is incomplete', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preview: {
          subtotal: 50,
          discount: 0,
          shipping: 3.99,
          total: 53.99,
          currency: 'EUR',
          isFirstPurchase: false,
        },
        priceChanges: [],
      }),
    });

    render(<CheckoutConfirmButton locale="es" />);

    fireEvent.change(screen.getByLabelText(/calle/i), {
      target: { value: 'Main St 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Completa la dirección para continuar',
      );
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('shows an error when saving the shipping address fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preview: {
          subtotal: 50,
          discount: 0,
          shipping: 3.99,
          total: 53.99,
          currency: 'EUR',
          isFirstPurchase: false,
        },
        priceChanges: [],
      }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo guardar la dirección de envío',
      );
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: {
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        },
      }),
    });
  });

  it('calls POST /api/cart/checkout on click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preview: {
          subtotal: 50,
          discount: 5,
          shipping: 3.99,
          total: 48.99,
          currency: 'EUR',
          isFirstPurchase: true,
        },
        priceChanges: [],
      }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 48.99,
        currency: 'EUR',
      }),
    });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            street: 'Main St 1',
            city: 'Madrid',
            postalCode: '28001',
            country: 'ES',
          },
        }),
      });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/checkout', {
        method: 'POST',
      });
    });
  });

  it('on 200 from preview, calls confirm and redirects to orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preview: {
          subtotal: 50,
          discount: 0,
          shipping: 3.99,
          total: 53.99,
          currency: 'EUR',
          isFirstPurchase: false,
        },
        priceChanges: [],
      }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 53.99,
        currency: 'EUR',
      }),
    });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptPriceChanges: false }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/orders/order-1');
    });
  });

  it('on 409 (price change), shows price change dialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Prices changed',
        priceChanges: [{ itemId: 'i1', oldPrice: 10, newPrice: 12 }],
      }),
    });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/cambio de precio/i)).toBeTruthy();
    });
  });

  it('accepting price changes calls confirm with acceptPriceChanges=true', async () => {
    // First call: preview returns 409
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Prices changed',
        priceChanges: [{ itemId: 'i1', oldPrice: 10, newPrice: 12 }],
      }),
    });
    // Second call: PATCH /api/users/me (persist address)
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Third call: confirm with acceptPriceChanges=true
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 55.99,
        currency: 'EUR',
      }),
    });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/cambio de precio/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /aceptar/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptPriceChanges: true }),
      });
    });
  });

  it('clears guest cart on successful checkout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preview: {
          subtotal: 50,
          discount: 0,
          shipping: 3.99,
          total: 53.99,
          currency: 'EUR',
          isFirstPurchase: false,
        },
        priceChanges: [],
      }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 53.99,
        currency: 'EUR',
      }),
    });

    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Main St 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });
});
