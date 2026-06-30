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

  it('renders a "Place Order" button', () => {
    render(<CheckoutConfirmButton locale="es" />);
    expect(screen.getByRole('button', { name: /place order/i })).toBeTruthy();
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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 48.99,
        currency: 'EUR',
      }),
    });

    render(<CheckoutConfirmButton locale="es" />);

    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 53.99,
        currency: 'EUR',
      }),
    });

    render(<CheckoutConfirmButton locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

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

    render(<CheckoutConfirmButton locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText(/price change/i)).toBeTruthy();
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
    // Second call: confirm with acceptPriceChanges=true
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 55.99,
        currency: 'EUR',
      }),
    });

    render(<CheckoutConfirmButton locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText(/price change/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderIds: ['order-1'],
        total: 53.99,
        currency: 'EUR',
      }),
    });

    render(<CheckoutConfirmButton locale="es" />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });
});
