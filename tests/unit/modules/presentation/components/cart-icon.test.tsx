import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CartIcon } from '@/modules/presentation/components/cart-icon';
import { CartPopupProvider } from '@/modules/presentation/components/cart-popup-context';

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

function renderWithProvider(ui: React.ReactElement) {
  return render(<CartPopupProvider>{ui}</CartPopupProvider>);
}

describe('CartIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a button that opens the cart popup', () => {
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

      renderWithProvider(<CartIcon alt="Shopping cart" />);

      const btn = screen.getByRole('button', { name: /shopping cart/i });
      expect(btn).toBeTruthy();
    });

    it('renders the cart icon as an svg with correct sprite href', () => {
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

      renderWithProvider(<CartIcon alt="My cart" />);

      const use = document.querySelector('use');
      expect(use).toBeTruthy();
      expect(use?.getAttribute('href')).toBe('/img/sprites.svg#icon-cart');
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
        itemCount: 3,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      renderWithProvider(<CartIcon alt="Cart" />);
      expect(screen.getByText('3')).toBeTruthy();
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

      renderWithProvider(<CartIcon alt="Cart" />);
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

      renderWithProvider(<CartIcon alt="Cart" />);
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
          items: [{ productId: 'p1' }, { productId: 'p2' }],
        }),
      });
      renderWithProvider(<CartIcon alt="Cart" />);
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cart');
      });
    });

    it('shows item count badge after fetching cart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{}, {}, {}] }),
      });
      renderWithProvider(<CartIcon alt="Cart" />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeTruthy();
      });
    });

    it('does NOT show badge when cart is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      renderWithProvider(<CartIcon alt="Cart" />);
      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('does NOT show badge when API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      renderWithProvider(<CartIcon alt="Cart" />);
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTitle(/cart items/i)).not.toBeInTheDocument();
    });

    it('does NOT show badge on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      renderWithProvider(<CartIcon alt="Cart" />);
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTitle(/cart items/i)).not.toBeInTheDocument();
    });
  });
});
