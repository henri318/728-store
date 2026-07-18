import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CartMergeDetector } from '@/modules/cart/presentation/components/cart-merge-detector';

const mockRefresh = vi.fn();
const mockFetch = vi.fn();
const mockClearCart = vi.fn();
const mockUseSession = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: [
      {
        productId: 'p1',
        sellerId: 's1',
        quantity: 2,
        unitPriceSnapshot: 10,
      },
    ],
    clearCart: mockClearCart,
  }),
}));

describe('CartMergeDetector', () => {
  const labels = {
    mergeTitle: '¿Unir tu carrito?',
    mergeDescription:
      'Tienes artículos en tu carrito de invitado y ya existe otro carrito. ¿Qué quieres hacer?',
    mergeBoth: 'Unir ambos',
    mergeBothHint: 'Combina los artículos de ambos carritos',
    keepServerCart: 'Conservar el carrito de la cuenta',
    keepServerHint: 'Descarta los artículos del carrito de invitado',
    keepGuestCart: 'Conservar el carrito de invitado',
    keepGuestHint:
      'Reemplaza el carrito de la cuenta con los artículos de invitado',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockUseSession.mockReturnValue({ status: 'authenticated', data: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('auto-merges without forcing a hard reload when the server cart is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<CartMergeDetector labels={labels} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart/migrate',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows merge dialog when both guest and server carts have items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 'server-item-1' }] }),
    });

    render(<CartMergeDetector labels={labels} />);

    await waitFor(() => {
      expect(screen.getByText(labels.mergeTitle)).toBeTruthy();
    });

    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/cart/migrate',
      expect.any(Object),
    );
  });

  it('aborts the cart check when unmounted', async () => {
    let signal: AbortSignal | undefined;
    mockFetch.mockImplementationOnce((_url: string, options?: RequestInit) => {
      signal = options?.signal ?? undefined;
      return new Promise(() => {});
    });

    const { unmount } = render(<CartMergeDetector labels={labels} />);

    await waitFor(() => expect(signal).toBeDefined());
    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('restarts the cart check after Strict Mode recreates the effect', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(
      <StrictMode>
        <CartMergeDetector labels={labels} />
      </StrictMode>,
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it.each(['ADMIN', 'DESIGNER'])(
    'does not check carts for %s users',
    (role) => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { role } },
      });

      render(<CartMergeDetector labels={labels} />);

      expect(mockFetch).not.toHaveBeenCalled();
    },
  );
});
