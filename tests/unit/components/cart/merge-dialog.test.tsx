import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeDialog } from '@/components/cart/merge-dialog';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog with three strategy options', () => {
    render(<MergeDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/merge both/i)).toBeTruthy();
    expect(screen.getByText(/keep server cart/i)).toBeTruthy();
    expect(screen.getByText(/keep guest cart/i)).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <MergeDialog isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls POST /api/cart/migrate with "merge" strategy when "Merge both" is clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/merge both/i));

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

    render(<MergeDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/keep server cart/i));

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

    render(<MergeDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/keep guest cart/i));

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
    render(<MergeDialog isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText(/merge both/i));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('sends guest items from context in the request body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<MergeDialog isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/merge both/i));

    await waitFor(() => {
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.guestItems).toHaveLength(1);
      expect(body.guestItems[0].productId).toBe('p1');
    });
  });
});
