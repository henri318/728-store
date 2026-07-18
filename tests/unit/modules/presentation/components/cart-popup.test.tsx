import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { CartPopup } from '@/modules/cart/presentation/components/cart-popup';
import { CartPopupProvider } from '@/modules/cart/presentation/components/cart-popup-context';

const mockFetch = vi.fn();
const mockUseSession = vi.fn();
const guestCartState: { items: Array<Record<string, unknown>> } = { items: [] };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/es/',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/modules/cart/presentation/components/cart-popup-context', () => ({
  CartPopupProvider: ({ children }: { children: React.ReactNode }) => children,
  useCartPopup: () => ({ isOpen: true, close: vi.fn(), open: vi.fn() }),
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: guestCartState.items,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

function renderPopup() {
  return render(
    <CartPopupProvider>
      <CartPopup
        labels={{
          title: 'Cart',
          empty: 'Empty',
          browseProducts: 'Browse',
          checkout: 'Checkout',
          viewFullCart: 'View full cart',
          subtotal: 'Subtotal',
          loading: 'Loading',
          soldBy: 'Sold by',
          remove: 'Remove',
          unknownProduct: 'Unknown Product',
          unknownSeller: 'Unknown Seller',
          increaseQuantity: 'Increase quantity',
          decreaseQuantity: 'Decrease quantity',
          close: 'Close',
        }}
      />
    </CartPopupProvider>,
  );
}

describe('CartPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guestCartState.items = [];
    vi.stubGlobal('fetch', mockFetch);
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'CUSTOMER' } },
      status: 'authenticated',
      update: vi.fn(),
    });
  });

  it('refetches cart items after cart:updated', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'i1', unitPrice: 10, quantity: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'i1', unitPrice: 10, quantity: 2 }],
        }),
      });

    renderPopup();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.any(Object));
    });

    act(() => {
      globalThis.dispatchEvent(new Event('cart:updated'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the newest cart response when requests resolve out of order', async () => {
    const firstResponse = Promise.withResolvers<unknown>();
    mockFetch
      .mockImplementationOnce(() => firstResponse.promise)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'new', productName: 'New cart', unitPrice: 10, quantity: 1 },
          ],
        }),
      });
    renderPopup();

    act(() => globalThis.dispatchEvent(new Event('cart:updated')));
    await waitFor(() => expect(screen.getByText('New cart')).toBeTruthy());
    firstResponse.resolve({
      ok: true,
      json: async () => ({
        items: [
          { id: 'old', productName: 'Old cart', unitPrice: 10, quantity: 1 },
        ],
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('New cart')).toBeTruthy();
      expect(screen.queryByText('Old cart')).toBeNull();
    });
  });

  it('shows the guest cart when an authenticated request is aborted on sign-out', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    guestCartState.items = [
      {
        id: 'guest-item',
        productId: 'guest-product',
        sellerId: 'seller-1',
        quantity: 1,
        unitPriceSnapshot: 10,
      },
    ];
    const { rerender } = renderPopup();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    rerender(
      <CartPopupProvider>
        <CartPopup
          labels={{
            title: 'Cart',
            empty: 'Empty',
            browseProducts: 'Browse',
            checkout: 'Checkout',
            viewFullCart: 'View full cart',
            subtotal: 'Subtotal',
            loading: 'Loading',
            soldBy: 'Sold by',
            remove: 'Remove',
            unknownProduct: 'Unknown Product',
            unknownSeller: 'Unknown Seller',
            increaseQuantity: 'Increase quantity',
            decreaseQuantity: 'Decrease quantity',
            close: 'Close',
          }}
        />
      </CartPopupProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading')).toBeNull();
      expect(screen.getByText('Unknown Product')).toBeTruthy();
    });
  });

  it.each(['ADMIN', 'DESIGNER', 'SUPPORT'])(
    'does not load carts for %s users',
    (role) => {
      mockUseSession.mockReturnValue({
        data: { user: { role } },
        status: 'authenticated',
      });

      renderPopup();

      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('dispatches cart:updated after removing an authenticated item', async () => {
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'i1',
              productId: 'p1',
              productName: 'Product',
              productImageUrl: null,
              sellerId: 's1',
              sellerName: 'Seller',
              unitPrice: 10,
              quantity: 1,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

    renderPopup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cart:updated' }),
      );
    });
  });
});
