import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: vi.fn(),
}));

import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';

const mockSession = vi.mocked(useSession);
const mockGuestCart = vi.mocked(useGuestCart);
const mockFetch = vi.fn();
const updateItemCustomization = vi.fn();

const props = {
  productId: 'product-1',
  productName: 'Mug',
  sellerId: 'seller-1',
  sellerName: 'Studio',
  price: 20,
  editCartItemId: 'cart-item-1',
  customization: { text: 'Updated text', color: 'Blue' },
  labels: {
    addToCart: 'Add to cart',
    removeFromCart: 'Remove',
    adding: 'Adding',
    added: 'Added',
    error: 'Error',
    increaseQuantity: 'Increase quantity',
    decreaseQuantity: 'Decrease quantity',
    saveDesign: 'Save design',
    addAnotherPersonalization: 'Add another personalization',
  },
};

function guestCart(items: Array<Record<string, unknown>>) {
  return {
    items,
    itemCount: items.length,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItemById: vi.fn(),
    updateCustomization: vi.fn(),
    updateItemCustomization,
    clearCart: vi.fn(),
    hydrated: true,
  };
}

describe('cart edit flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockGuestCart.mockReturnValue(guestCart([]) as never);
  });

  it('updates the matching guest cart line through useGuestCart', async () => {
    mockSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
    } as never);
    mockGuestCart.mockReturnValue(
      guestCart([
        {
          id: 'guest-item-1',
          productId: 'product-1',
          quantity: 1,
          customizationText: 'Updated text',
          customizationColor: 'Blue',
        },
      ]) as never,
    );

    render(<AddToCartButton {...props} editCartItemId={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save design' }));

    await waitFor(() =>
      expect(updateItemCustomization).toHaveBeenCalledWith(
        'guest-item-1',
        expect.objectContaining({ text: 'Updated text', color: 'Blue' }),
      ),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('updates the authenticated cart line with a customization PATCH', async () => {
    mockSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { role: 'CUSTOMER' } },
    } as never);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 'cart-item-1', quantity: 2 }] }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<AddToCartButton {...props} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save design' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save design' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cart/items/cart-item-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            quantity: 2,
            customization: {
              text: 'Updated text',
              color: 'Blue',
              size: null,
              imageUrl: null,
              imageUploadId: null,
              designPosition: null,
            },
          }),
        }),
      ),
    );
  });
});
