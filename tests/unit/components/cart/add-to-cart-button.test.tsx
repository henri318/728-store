import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';

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
      increaseQuantity: 'Increase quantity',
      decreaseQuantity: 'Decrease quantity',
      saveDesign: 'Save design',
      addAnotherPersonalization: 'Add another personalization',
    },
  };

  const mockAddItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockUseGuestCart.mockReturnValue({
      items: [],
      itemCount: 0,
      addItem: mockAddItem,
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItemById: vi.fn(),
      updateCustomization: vi.fn(),
      updateItemCustomization: vi.fn(),
      clearCart: vi.fn(),
      hydrated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

    it.each(['ADMIN', 'DESIGNER', 'SUPPORT'])(
      'does not render or load a cart for the non-customer %s role',
      async (role) => {
        mockUseSession.mockReturnValue({
          data: {
            user: { id: 'user-1', name: 'Internal user', role },
          } as never,
          status: 'authenticated',
          update: vi.fn(),
        } as never);

        render(<AddToCartButton {...defaultProps} />);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockFetch).not.toHaveBeenCalled();
        expect(
          screen.queryByRole('button', { name: /add to cart/i }),
        ).toBeNull();
      },
    );
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

    it('does not render a warning when a different personalization is already in the cart', () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 1,
            unitPriceSnapshot: 29.99,
            customizationText: 'First design',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItemById: vi.fn(),
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Second design' }}
          labels={defaultProps.labels}
        />,
      );

      expect(
        screen.queryByText('Already customized differently'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add to cart/i }),
      ).toBeEnabled();
    });

    it('offers explicit save and add-another actions for a matching cart line', () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 1,
            unitPriceSnapshot: 29.99,
            customizationText: 'Edited design',
            customizationColor: 'red',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItemById: vi.fn(),
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Edited design', color: 'red' }}
          labels={defaultProps.labels}
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Save design' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add another personalization' }),
      ).toBeInTheDocument();
    });

    it('saves the current guest line without creating another line', () => {
      const updateItemCustomization = vi.fn();
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 1,
            unitPriceSnapshot: 29.99,
            customizationText: 'Edited design',
            customizationColor: 'red',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItemById: vi.fn(),
        updateCustomization: vi.fn(),
        updateItemCustomization,
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Edited design', color: 'red' }}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Save design' }));

      expect(updateItemCustomization).toHaveBeenCalledWith(
        'guest-item-1',
        expect.objectContaining({ text: 'Edited design', color: 'red' }),
      );
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('adds another guest line while preserving the current line', async () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 1,
            unitPriceSnapshot: 29.99,
            customizationText: 'Edited design',
          },
        ],
        itemCount: 1,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        removeItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItemById: vi.fn(),
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Edited design' }}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Add another personalization' }),
      );

      await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1));
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ customizationText: 'Edited design' }),
      );
    });

    it('sends one coordinated request when adding an authenticated customization', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'Test', role: 'CUSTOMER' },
        } as never,
        status: 'authenticated',
        update: vi.fn(),
      } as never);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 1,
              customizations: [{ text: 'Edited design' }],
            },
          ],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Edited design' }}
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Add another personalization' }),
        ).toBeEnabled(),
      );
      const addAnother = screen.getByRole('button', {
        name: 'Add another personalization',
      });
      fireEvent.click(addAnother);
      fireEvent.click(addAnother);

      expect(addAnother).toBeDisabled();
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cart/items',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            productId: 'prod-1',
            quantity: 1,
            customizationIdList: [],
            customization: {
              text: 'Edited design',
              color: null,
              size: null,
              imageUrl: null,
              imageUploadId: null,
              designPosition: null,
            },
          }),
        }),
      );
      expect(
        mockFetch.mock.calls.filter(
          ([url]) => url === '/api/customizations/customer',
        ),
      ).toHaveLength(0);
    });

    it('locks conflicting cart actions and reports a failed authenticated save', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'Test', role: 'CUSTOMER' },
        } as never,
        status: 'authenticated',
        update: vi.fn(),
      } as never);
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 2,
              customizations: [{ text: 'Updated design' }],
            },
          ],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 409 });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Updated design' }}
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /save design/i }),
        ).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() =>
        expect(screen.getByText('Error')).toBeInTheDocument(),
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/cart/items/cart-item-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            quantity: 2,
            customization: {
              text: 'Updated design',
              color: null,
              size: null,
              imageUrl: null,
              imageUploadId: null,
              designPosition: null,
            },
          }),
        }),
      );
      expect(
        mockFetch.mock.calls.filter(
          ([url]) => url === '/api/customizations/customer',
        ),
      ).toHaveLength(0);
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cart:updated' }),
      );
    });

    it('reports an error when creating the authenticated customization fails', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'Test', role: 'CUSTOMER' },
        } as never,
        status: 'authenticated',
        update: vi.fn(),
      } as never);
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 1,
              customizations: [{ text: 'Updated design' }],
            },
          ],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Updated design' }}
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /save design/i }),
        ).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() =>
        expect(screen.getByText('Error')).toBeInTheDocument(),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cart:updated' }),
      );
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'Test', role: 'CUSTOMER' },
        } as never,
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
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
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

    it('reports a failed customized add without a follow-up customization request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Atomic design' }}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      await waitFor(() =>
        expect(screen.getByText('Error')).toBeInTheDocument(),
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/cart/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            productId: 'prod-1',
            quantity: 1,
            customizationIdList: [],
            customization: {
              text: 'Atomic design',
              color: null,
              size: null,
              imageUrl: null,
              imageUploadId: null,
              designPosition: null,
            },
          }),
        }),
      );
      expect(
        mockFetch.mock.calls.filter(
          ([url]) => url === '/api/customizations/customer',
        ),
      ).toHaveLength(0);
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
            id: 'guest-item-1',
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
        updateItemQuantity: mockUpdateQuantity,
        removeItemById: mockRemoveItem,
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
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

      expect(mockUpdateQuantity).toHaveBeenCalledWith('guest-item-1', 4);
    });

    it('calls updateQuantity on - click when quantity > 1', async () => {
      render(<AddToCartButton {...defaultProps} />);

      fireEvent.click(
        screen.getByRole('button', { name: /decrease quantity/i }),
      );

      expect(mockUpdateQuantity).toHaveBeenCalledWith('guest-item-1', 2);
    });

    it('shows remove button and calls removeItem when quantity is 1', async () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
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
        updateItemQuantity: mockUpdateQuantity,
        removeItemById: mockRemoveItem,
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<AddToCartButton {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /decrease quantity/i }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(mockRemoveItem).toHaveBeenCalledWith('guest-item-1');
    });

    it('does not increment past 99', async () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
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
        updateItemQuantity: mockUpdateQuantity,
        removeItemById: mockRemoveItem,
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(<AddToCartButton {...defaultProps} />);

      const plusBtn = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      expect(plusBtn).toBeDisabled();
    });

    it('prioritizes editCartItemId over customization matching for a guest line', () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-being-edited',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 4,
            unitPriceSnapshot: 29.99,
            customizationText: 'Original design',
          },
        ],
        itemCount: 4,
        addItem: mockAddItem,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        updateItemQuantity: mockUpdateQuantity,
        removeItemById: mockRemoveItem,
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });

      render(
        <AddToCartButton
          {...defaultProps}
          editCartItemId="guest-item-being-edited"
          customization={{ text: 'Changed design' }}
        />,
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('disables every cart action when the button is disabled', () => {
      mockUseGuestCart.mockReturnValue({
        items: [
          {
            id: 'guest-item-1',
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 3,
            unitPriceSnapshot: 29.99,
            customizationText: 'Design',
          },
        ],
        itemCount: 3,
        addItem: mockAddItem,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        updateItemQuantity: mockUpdateQuantity,
        removeItemById: mockRemoveItem,
        updateCustomization: vi.fn(),
        updateItemCustomization: vi.fn(),
        clearCart: vi.fn(),
        hydrated: true,
      });
      render(
        <AddToCartButton
          {...defaultProps}
          disabled
          customization={{ text: 'Design' }}
        />,
      );

      expect(
        screen.getByRole('button', { name: /decrease quantity/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /increase quantity/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /save design/i }),
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
    });
  });

  describe('quantity controls — authenticated user', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'Test', role: 'CUSTOMER' },
        } as never,
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
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
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
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
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

    it('does not render the authenticated add-another action without a localized label', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 1,
              customizations: [{ text: 'Existing design' }],
            },
          ],
        }),
      });

      render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'New design' }}
          labels={{
            ...defaultProps.labels,
            addAnotherPersonalization: undefined,
          }}
        />,
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /add another/i }),
        ).not.toBeInTheDocument();
      });
    });

    it('derives a new match from the loaded cart without another GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'cart-item-a',
              productId: 'prod-1',
              quantity: 1,
              customizations: [{ text: 'First design' }],
            },
            {
              id: 'cart-item-b',
              productId: 'prod-1',
              quantity: 2,
              customizations: [{ text: 'Second design' }],
            },
          ],
        }),
      });

      const { rerender } = render(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'First design' }}
        />,
      );

      await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
      rerender(
        <AddToCartButton
          {...defaultProps}
          customization={{ text: 'Second design' }}
        />,
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('keeps a later optimistic quantity when an earlier request fails', async () => {
      const { promise: firstUpdate, reject: rejectFirstUpdate } =
        Promise.withResolvers<never>();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 2 }],
        }),
      });
      mockFetch.mockImplementationOnce(() => firstUpdate);
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
      fireEvent.click(
        screen.getByRole('button', { name: /increase quantity/i }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: /increase quantity/i }),
      );
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

      rejectFirstUpdate(new Error('Network error'));

      await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('reports failures after optimistic quantity and removal mutations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'cart-item-1', productId: 'prod-1', quantity: 1 }],
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: false });

      render(<AddToCartButton {...defaultProps} />);

      await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() =>
        expect(screen.getByText('Error')).toBeInTheDocument(),
      );
    });
  });
});
