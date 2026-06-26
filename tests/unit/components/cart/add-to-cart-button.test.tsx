import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

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

describe('AddToCartButton', () => {
  const defaultProps = {
    productId: 'prod-1',
    productName: 'Test Product',
    sellerId: 'seller-1',
    sellerName: 'Test Seller',
    price: 29.99,
  };

  const mockAddItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGuestCart.mockReturnValue({
      items: [],
      itemCount: 0,
      addItem: mockAddItem,
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      hydrated: true,
    });
  });

  describe('rendering', () => {
    it('renders "Add to Cart" button', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);

      render(<AddToCartButton {...defaultProps} />);

      expect(screen.getByRole('button', { name: /add to cart/i })).toBeTruthy();
    });

    it('is not disabled by default', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);

      render(<AddToCartButton {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /add to cart/i }),
      ).not.toBeDisabled();
    });

    it('can be disabled via prop', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);

      render(<AddToCartButton {...defaultProps} disabled />);

      expect(
        screen.getByRole('button', { name: /add to cart/i }),
      ).toBeDisabled();
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

    it('calls addItem from guest cart context on click', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
          sellerId: 'seller-1',
          quantity: 1,
          unitPriceSnapshot: 29.99,
          productName: 'Test Product',
          sellerName: 'Test Seller',
        }),
      );
    });

    it('does NOT call fetch API', () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows success feedback after adding', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/added|✓/i)).toBeTruthy();
      });
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

    it('POSTs to /api/cart/items on click', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cart/items',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });
    });

    it('sends correct body in POST request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cart/items',
          expect.objectContaining({
            body: JSON.stringify({
              productId: 'prod-1',
              quantity: 1,
            }),
          }),
        );
      });
    });

    it('shows success feedback after API responds ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/added|✓/i)).toBeTruthy();
      });
    });

    it('does NOT call guest cart addItem', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('shows error feedback when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/error|try again/i)).toBeTruthy();
      });
    });

    it('shows error feedback on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/error|try again/i)).toBeTruthy();
      });
    });
  });
});
