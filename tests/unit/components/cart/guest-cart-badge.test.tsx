import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuestCartBadge } from '@/components/cart/guest-cart-badge';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock the guest cart context
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: vi.fn(),
}));

// Mock next/navigation for usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/es/some-page'),
}));

import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';

const mockUseSession = vi.mocked(useSession);
const mockUseGuestCart = vi.mocked(useGuestCart);

describe('GuestCartBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders item count when unauthenticated and items > 0', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    } as never);
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
          sellerId: 's2',
          quantity: 1,
          unitPriceSnapshot: 20,
        },
      ],
      itemCount: 2,
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<GuestCartBadge />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('links to /{locale}/cart', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    } as never);
    mockUseGuestCart.mockReturnValue({
      items: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
        },
      ],
      itemCount: 1,
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<GuestCartBadge />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/es/cart');
  });

  it('does NOT render when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', name: 'Test' } } as never,
      status: 'authenticated',
      update: vi.fn(),
    } as never);
    mockUseGuestCart.mockReturnValue({
      items: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
        },
      ],
      itemCount: 1,
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    });

    const { container } = render(<GuestCartBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('does NOT render when itemCount is 0', () => {
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
    });

    const { container } = render(<GuestCartBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('does NOT render when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    } as never);
    mockUseGuestCart.mockReturnValue({
      items: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
        },
      ],
      itemCount: 1,
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    });

    const { container } = render(<GuestCartBadge />);
    expect(container.innerHTML).toBe('');
  });
});
