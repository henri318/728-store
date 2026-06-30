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
    labels: {
      addToCart: 'Add to Cart',
      removeFromCart: 'Remove',
      adding: '...',
      added: '✓',
      error: 'Error',
    },
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
      // First mock: useEffect cart fetch on mount (empty cart).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      // Second mock: POST on click.
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
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
              customizationIdList: [],
            }),
          }),
        );
      });
    });

    it('shows success feedback after API responds ok', async () => {
      // Cart fetch on mount (empty cart).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      // POST on click.
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/added|✓/i)).toBeTruthy();
      });
    });

    it('dispatches cart:updated after authenticated add succeeds', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'cart:updated' }),
        );
      });
    });

    it('does NOT call guest cart addItem', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('adds guest customization payload to the guest cart context', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);

      mockUseGuestCart.mockReturnValue({
        items: [],
        itemCount: 0,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{
            text: 'Hello mug',
            color: 'Blue',
            size: 'M',
            imageUrl: '/preview.png',
            imageUploadId: 'upload-1',
          }}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
          sellerId: 'seller-1',
          customizationText: 'Hello mug',
          customizationColor: 'Blue',
          customizationSize: 'M',
          customizationImageUrl: '/preview.png',
          customizationImageUploadId: 'upload-1',
        }),
      );
    });

    it('shows error feedback when API fails', async () => {
      // Cart fetch on mount (empty cart).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      // POST on click fails.
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
      // Cart fetch on mount (empty cart).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      // POST on click fails with network error.
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(screen.getByText(/error|try again/i)).toBeTruthy();
      });
    });

    it('creates a customer customization before adding a customized item to the cart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cust-1' }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{
            text: 'Hello mug',
            color: 'Blue',
            size: 'M',
            imageUrl: '/preview.png',
            imageUploadId: null,
          }}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/customizations/customer',
          expect.objectContaining({
            method: 'POST',
          }),
        );
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            productId: 'prod-1',
            quantity: 1,
            customizationIdList: ['cust-1'],
          }),
        }),
      );
    });
  });

  describe('quantity controls — guest user', () => {
    const mockUpdateQuantity = vi.fn();
    const mockRemoveItem = vi.fn();

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as never);
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 3,
            unitPriceSnapshot: 29.99,
            productName: 'Test Product',
            sellerName: 'Test Seller',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: vi.fn(),
        hydrated: true,
      });
    });

    it('shows quantity controls when product is in guest cart', () => {
      render(<AddToCartButton {...defaultProps} />);

      expect(screen.getByText('3')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /decrease quantity/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /increase quantity/i }),
      ).toBeTruthy();
    });

    it('does NOT show "Add to Cart" button when product is in cart', () => {
      render(<AddToCartButton {...defaultProps} />);

      expect(
        screen.queryByRole('button', { name: /add to cart/i }),
      ).not.toBeInTheDocument();
    });

    it('calls updateQuantity on + click', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(
        screen.getByRole('button', { name: /increase quantity/i }),
      );

      expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-1', 4);
    });

    it('calls updateQuantity on - click when quantity > 1', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(
        screen.getByRole('button', { name: /decrease quantity/i }),
      );

      expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-1', 2);
    });

    it('shows remove button and calls removeItem when quantity is 1', async () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 1,
            unitPriceSnapshot: 29.99,
            productName: 'Test Product',
            sellerName: 'Test Seller',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<AddToCartButton {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /decrease quantity/i }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(mockRemoveItem).toHaveBeenCalledWith('prod-1');
    });

    it('does not increment past 99', async () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 99,
            unitPriceSnapshot: 29.99,
            productName: 'Test Product',
            sellerName: 'Test Seller',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<AddToCartButton {...defaultProps} />);

      const plusBtn = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      expect(plusBtn).toBeDisabled();
    });
  });

  describe('quantity controls — authenticated user', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', name: 'Test' } } as never,
        status: 'authenticated',
        update: vi.fn(),
      } as never);
    });

    it('fetches cart and shows quantity controls when product is in cart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 2,
            },
          ],
        }),
      });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeTruthy();
        expect(
          screen.getByRole('button', { name: /decrease quantity/i }),
        ).toBeTruthy();
        expect(
          screen.getByRole('button', { name: /increase quantity/i }),
        ).toBeTruthy();
      });
    });

    it('PATCHes to /api/cart/items/[itemId] on + click', async () => {
      // First fetch: cart GET on mount
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 2 }],
        }),
      });
      // Second fetch: PATCH for increment
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /increase quantity/i }),
        ).toBeTruthy();
      });

      fireEvent.click(
        screen.getByRole('button', { name: /increase quantity/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cart/items/cart-item-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ quantity: 3 }),
          }),
        );
      });
    });

    it('dispatches cart:updated after authenticated quantity update succeeds', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 2 }],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /increase quantity/i }),
        ).toBeTruthy();
      });

      fireEvent.click(
        screen.getByRole('button', { name: /increase quantity/i }),
      );

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'cart:updated' }),
        );
      });
    });

    it('DELETEs /api/cart/items/[itemId] on remove button click at quantity 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 1 }],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /decrease quantity/i }),
        ).toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cart/items/cart-item-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    it('dispatches cart:updated after authenticated remove succeeds', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 1 }],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'cart:updated' }),
        );
      });
    });

    it('shows "Add to Cart" when authenticated cart does not contain product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'other-item', productId: 'prod-999', quantity: 1 }],
        }),
      });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add to cart/i }),
        ).toBeTruthy();
      });
    });
  });
});
