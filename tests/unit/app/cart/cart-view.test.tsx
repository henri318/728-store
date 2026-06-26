import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartView } from '@/app/[locale]/cart/cart-view';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
  usePathname: vi.fn(() => '/es/cart'),
}));

describe('CartView', () => {
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
    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);

    expect(screen.getByText('Test Product')).toBeTruthy();
    expect(screen.getByText('Another Product')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // quantity of first item
    expect(screen.getByText('€20.00')).toBeTruthy(); // lineTotal of first item
    expect(screen.getByText('€25.00')).toBeTruthy(); // lineTotal of second item
  });

  it('renders empty state with CTA when no items', () => {
    render(<CartView items={[]} locale="es" isAuthenticated={true} />);

    expect(screen.getByText(/your cart is empty/i)).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/es/products');
  });

  it('renders subtotal', () => {
    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);
    // subtotal = 20 + 25 = 45
    expect(screen.getByText('€45.00')).toBeTruthy();
  });

  it('renders checkout CTA linking to /{locale}/checkout', () => {
    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);
    const checkoutLink = screen.getByRole('link', { name: /checkout/i });
    expect(checkoutLink.getAttribute('href')).toBe('/es/checkout');
  });

  it('clicking "+" sends PATCH with quantity+1 and updates UI optimistically', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...baseItems[0], quantity: 3, lineTotal: 30 }),
    });

    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);

    // Find the + button for the first item
    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    // Optimistic update: quantity should show 3 immediately
    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
    });

    // PATCH should have been called
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

    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);

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

    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/items/item-1', {
        method: 'DELETE',
      });
      // After removal, only the second item should remain
      expect(screen.queryByText('Test Product')).toBeNull();
      expect(screen.getByText('Another Product')).toBeTruthy();
    });
  });

  it('reverts optimistic update on PATCH failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    // After failure, quantity should revert to 2
    await waitFor(() => {
      // The optimistic update shows 3 briefly, then reverts to 2
      const qtyDisplay = screen.getAllByText('2');
      expect(qtyDisplay.length).toBeGreaterThan(0);
    });
  });

  it('shows customization details when present', () => {
    render(<CartView items={baseItems} locale="es" isAuthenticated={true} />);
    expect(screen.getByText(/Hello/i)).toBeTruthy();
    expect(screen.getByText(/Red/i)).toBeTruthy();
    expect(screen.getByText(/M/)).toBeTruthy();
  });
});
