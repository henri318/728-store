import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { CartPopup } from '@/modules/presentation/components/cart-popup';
import { CartPopupProvider } from '@/modules/presentation/components/cart-popup-context';

const mockFetch = vi.fn();
const mockUseSession = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/es/products',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/modules/presentation/components/cart-popup-context', () => ({
  CartPopupProvider: ({ children }: { children: React.ReactNode }) => children,
  useCartPopup: () => ({ isOpen: true, close: vi.fn(), open: vi.fn() }),
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: [],
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

global.fetch = mockFetch;

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
        }}
      />
    </CartPopupProvider>,
  );
}

describe('CartPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1' } },
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
      window.dispatchEvent(new Event('cart:updated'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('dispatches cart:updated after removing an authenticated item', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
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
