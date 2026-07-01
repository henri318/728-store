import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeDialog } from '@/modules/cart/presentation/components/merge-dialog';

// Mock the guest cart context
const mockClearCart = vi.fn();
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
    itemCount: 1,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: mockClearCart,
  }),
  GUEST_CART_STORAGE_KEY: 'cart:guest:v1',
}));

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MergeDialog', () => {
  const labels = {
    title: '¿Unir tu carrito?',
    description:
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
  });

  it('renders the dialog with three strategy options', () => {
    render(<MergeDialog isOpen={true} onClose={vi.fn()} labels={labels} />);

    expect(screen.getByText(labels.mergeBoth)).toBeTruthy();
    expect(screen.getByText(labels.keepServerCart)).toBeTruthy();
    expect(screen.getByText(labels.keepGuestCart)).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <MergeDialog isOpen={false} onClose={vi.fn()} labels={labels} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls POST /api/cart/migrate with "merge" strategy when "Merge both" is clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} labels={labels} />);

    fireEvent.click(screen.getByText(labels.mergeBoth));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"strategy":"merge"'),
      });
    });
  });

  it('calls POST /api/cart/migrate with "keep-server" strategy', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} labels={labels} />);

    fireEvent.click(screen.getByText(labels.keepServerCart));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"strategy":"keep-server"'),
      });
    });
  });

  it('calls POST /api/cart/migrate with "keep-guest" strategy', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} labels={labels} />);

    fireEvent.click(screen.getByText(labels.keepGuestCart));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"strategy":"keep-guest"'),
      });
    });
  });

  it('clears guest cart and refreshes on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const onClose = vi.fn();
    render(<MergeDialog isOpen={true} onClose={onClose} labels={labels} />);

    fireEvent.click(screen.getByText(labels.mergeBoth));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('sends guest items from context in the request body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} labels={labels} />);

    fireEvent.click(screen.getByText(labels.mergeBoth));

    await waitFor(() => {
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.guestItems).toHaveLength(1);
      expect(body.guestItems[0].productId).toBe('p1');
    });
  });
});
