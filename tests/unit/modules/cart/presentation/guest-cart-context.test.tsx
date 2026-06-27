import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import {
  GuestCartProvider,
  useGuestCart,
  GUEST_CART_STORAGE_KEY,
} from '@/modules/cart/presentation/guest-cart-context';

// Helper component that exposes the context values for testing.
function CartConsumer() {
  const { items, addItem, updateQuantity, removeItem, clearCart, itemCount } =
    useGuestCart();

  return (
    <div>
      <span data-testid="item-count">{itemCount}</span>
      <span data-testid="items">{JSON.stringify(items)}</span>
      <button
        data-testid="add-btn"
        onClick={() =>
          addItem({
            productId: 'prod-1',
            sellerId: 'seller-1',
            quantity: 2,
            unitPriceSnapshot: 10.0,
          })
        }
      >
        Add
      </button>
      <button
        data-testid="add-btn-2"
        onClick={() =>
          addItem({
            productId: 'prod-2',
            sellerId: 'seller-2',
            quantity: 1,
            unitPriceSnapshot: 25.5,
            customizationSize: 'M',
          })
        }
      >
        Add 2
      </button>
      <button
        data-testid="update-btn"
        onClick={() => updateQuantity('prod-1', 5)}
      >
        Update
      </button>
      <button data-testid="remove-btn" onClick={() => removeItem('prod-1')}>
        Remove
      </button>
      <button data-testid="clear-btn" onClick={() => clearCart()}>
        Clear
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <GuestCartProvider>
      <CartConsumer />
    </GuestCartProvider>,
  );
}

describe('GuestCartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty items and zero count', () => {
    renderWithProvider();
    expect(screen.getByTestId('item-count').textContent).toBe('0');
    expect(screen.getByTestId('items').textContent).toBe('[]');
  });

  it('addItem adds an item and increments count', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    expect(screen.getByTestId('item-count').textContent).toBe('2');
    const items = JSON.parse(screen.getByTestId('items').textContent!);
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('prod-1');
    expect(items[0].quantity).toBe(2);
    expect(items[0].unitPriceSnapshot).toBe(10.0);
  });

  it('persists items to localStorage', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    const stored = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY)!);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].productId).toBe('prod-1');
  });

  it('hydrates from localStorage on mount', () => {
    const existing = {
      items: [
        {
          productId: 'prod-x',
          sellerId: 'seller-x',
          quantity: 3,
          unitPriceSnapshot: 15.0,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(existing));

    renderWithProvider();
    expect(screen.getByTestId('item-count').textContent).toBe('3');
    const items = JSON.parse(screen.getByTestId('items').textContent!);
    expect(items[0].productId).toBe('prod-x');
  });

  it('updateQuantity changes the quantity of an existing item', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('update-btn'));
    });
    const items = JSON.parse(screen.getByTestId('items').textContent!);
    expect(items[0].quantity).toBe(5);
  });

  it('removeItem removes an item by productId', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    expect(screen.getByTestId('item-count').textContent).toBe('2');
    act(() => {
      fireEvent.click(screen.getByTestId('remove-btn'));
    });
    expect(screen.getByTestId('item-count').textContent).toBe('0');
  });

  it('clearCart removes all items and clears localStorage', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn-2'));
    });
    expect(screen.getByTestId('item-count').textContent).toBe('3');
    act(() => {
      fireEvent.click(screen.getByTestId('clear-btn'));
    });
    expect(screen.getByTestId('item-count').textContent).toBe('0');
    expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
  });

  it('itemCount is the sum of all item quantities', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('add-btn-2'));
    });
    // quantities are 2 + 1 = 3
    expect(screen.getByTestId('item-count').textContent).toBe('3');
  });

  it('handles invalid localStorage data gracefully', () => {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, 'not-valid-json');
    renderWithProvider();
    expect(screen.getByTestId('item-count').textContent).toBe('0');
  });
});
