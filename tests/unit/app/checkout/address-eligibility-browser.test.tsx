import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutConfirmButton } from '@/modules/cart/presentation/components/checkout-confirm-button';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({ clearCart: vi.fn() }),
}));

describe('checkout address browser behavior', () => {
  it('blocks an incomplete address before making checkout requests', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<CheckoutConfirmButton locale="es" initialAddress={{}} />);
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /completa la dirección/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('shows the server Spain-only error and blocks confirmation', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        if (input === '/api/users/me')
          return new Response('{}', { status: 200 });
        if (input === '/api/cart/checkout')
          return new Response('{}', { status: 200 });
        return Response.json(
          { error: 'Delivery is available only in Spain' },
          { status: 422 },
        );
      });
    render(
      <CheckoutConfirmButton
        locale="es"
        initialAddress={{
          street: 'Mayor',
          houseNumber: '1',
          city: 'Madrid',
          postalCode: '28013',
          country: 'France',
          countryCode: 'FR',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /realizar pedido/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/only in Spain/i),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cart/checkout/confirm',
      expect.anything(),
    );
    fetchMock.mockRestore();
  });
});
