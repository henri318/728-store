import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CartIcon } from '@/modules/presentation/components/cart-icon';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/es/some-page',
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock guest cart context
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: vi.fn(),
}));

import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';

const mockUseSession = vi.mocked(useSession);
const mockUseGuestCart = vi.mocked(useGuestCart);
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CartIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a link to the cart page with correct locale', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);
      mockUseGuestCart.mockReturnValue({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<CartIcon alt="Shopping cart" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/es/cart');
    });

    it('renders the cart icon image with correct alt text', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);
      mockUseGuestCart.mockReturnValue({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<CartIcon alt="My cart" />);

      const img = screen.getByAltText('My cart');
      expect(img).toBeTruthy();
      expect(img).toHaveAttribute('src', '/img/icons/iconos-04.svg');
    });
  });

  describe('guest user (unauthenticated)', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);
    });

    it('shows item count badge when guest cart has items', () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            productId: 'p1',
            sellerId: 's1',
            quantity: 2,
            unitPriceSnapshot: 10,
          },
          {
            productId: 'p2',
            sellerId: 's1',
            quantity: 1,
            unitPriceSnapshot: 20,
          },
        ],
        itemCount: 2,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<CartIcon alt="Cart" />);

      expect(screen.getByText('2')).toBeTruthy();
    });

    it('does NOT show badge when guest cart is empty', () => {
      mockUseGuestCart.mockReturnValue({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<CartIcon alt="Cart" />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('does NOT fetch from API for guest users', () => {
      mockUseGuestCart.mockReturnValue({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<CartIcon alt="Cart" />);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', name: 'Test' } } as never,
        status: 'authenticated',
        update: vi.fn(),
      } as never);
    });

    it('fetches cart count from /api/cart on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 },
          ],
        }),
      });

      render(<CartIcon alt="Cart" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cart');
      });
    });

    it('shows item count badge after fetching cart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 },
            { productId: 'p3', quantity: 5 },
          ],
        }),
      });

      render(<CartIcon alt="Cart" />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeTruthy();
      });
    });

    it('does NOT show badge when cart is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      render(<CartIcon alt="Cart" />);

      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('does NOT show badge when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<CartIcon alt="Cart" />);

      // Wait a bit to ensure no badge appears
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTitle(/cart items/i)).not.toBeInTheDocument();
    });

    it('does NOT show badge on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<CartIcon alt="Cart" />);

      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTitle(/cart items/i)).not.toBeInTheDocument();
    });
  });
});
