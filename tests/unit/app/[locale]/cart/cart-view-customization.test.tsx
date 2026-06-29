import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartView } from '@/app/[locale]/cart/cart-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: vi.fn(() => '/es/cart'),
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: [],
    itemCount: 0,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

describe('CartView customization links', () => {
  it('links back to the PDP with customization query parameters', () => {
    const labels = {
      title: 'Tu carrito',
      emptyTitle: 'Tu carrito está vacío',
      emptyDescription:
        'Explora nuestros productos y encuentra algo que te encante.',
      browseProducts: 'Explorar productos',
      soldBy: 'Vendido por',
      remove: 'Eliminar',
      subtotal: 'Subtotal',
      checkout: 'Finalizar compra',
      unknownProduct: 'Producto desconocido',
      unknownSeller: 'Vendedor desconocido',
      customizationSize: 'Talla',
      customizationColor: 'Color',
      customizationText: 'Texto',
      customizationEditFromCart: 'Editar personalización',
    };

    render(
      <CartView
        items={[
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            productImageUrl: null,
            sellerId: 'seller-1',
            sellerName: 'Test Seller',
            quantity: 1,
            unitPrice: 10,
            lineTotal: 10,
            customization: {
              text: 'Hello',
              color: 'Blue',
              size: 'M',
              imageUrl: '/customization.png',
            },
          },
        ]}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const link = screen.getByRole('link', {
      name: labels.customizationEditFromCart,
    });
    expect(link.getAttribute('href')).toContain('/es/products/prod-1?');
    expect(link.getAttribute('href')).toContain('customizationText=Hello');
    expect(link.getAttribute('href')).toContain('customizationColor=Blue');
    expect(link.getAttribute('href')).toContain('customizationSize=M');
    expect(link.getAttribute('href')).toContain(
      'customizationImageUrl=%2Fcustomization.png',
    );
  });
});
