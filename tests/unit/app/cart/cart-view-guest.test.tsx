import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartView } from '@/app/[locale]/cart/cart-view';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: vi.fn(() => '/es/cart'),
}));

// Mock guest cart context
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: guestCartItems,
    itemCount: guestCartItems.length,
    addItem: vi.fn(),
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

// Mutable guest cart items — tests override via setGuestCartItems()
let guestCartItems: Array<{
  productId: string;
  sellerId: string;
  quantity: number;
  unitPriceSnapshot: number;
  productName?: string;
  productImageUrl?: string | null;
  sellerName?: string;
}> = [];

function setGuestCartItems(items: typeof guestCartItems) {
  guestCartItems = items;
}

describe('CartView — guest cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGuestCartItems([]);
  });

  const guestItems = [
    {
      productId: 'prod-1',
      sellerId: 'seller-1',
      quantity: 2,
      unitPriceSnapshot: 10.0,
      productName: 'Guest Product',
      productImageUrl: null,
      sellerName: 'Guest Seller',
    },
    {
      productId: 'prod-2',
      sellerId: 'seller-2',
      quantity: 1,
      unitPriceSnapshot: 25.0,
      productName: 'Another Guest Product',
      productImageUrl: '/img/test.png',
      sellerName: 'Another Seller',
    },
  ];

  it('renders guest cart items when not authenticated', () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    expect(screen.getByText('Guest Product')).toBeTruthy();
    expect(screen.getByText('Another Guest Product')).toBeTruthy();
  });

  it('shows empty state when guest cart is empty', () => {
    setGuestCartItems([]);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    expect(screen.getByText(/your cart is empty/i)).toBeTruthy();
  });

  it('calls updateQuantity on guest context when changing quantity', async () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-1', 3);
  });

  it('calls removeItem on guest context when removing', async () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(mockRemoveItem).toHaveBeenCalledWith('prod-1');
  });

  it('does NOT call fetch API for guest cart operations', async () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT show checkout link for guest users', () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    expect(screen.queryByRole('link', { name: /checkout/i })).toBeNull();
  });

  it('computes subtotal from guest cart items', () => {
    setGuestCartItems(guestItems);

    render(<CartView items={[]} locale="es" isAuthenticated={false} />);

    // 10*2 + 25*1 = 45
    expect(screen.getByText('€45.00')).toBeTruthy();
  });
});
