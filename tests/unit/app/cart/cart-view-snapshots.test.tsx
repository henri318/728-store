import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartView } from '@/modules/cart/presentation/components/cart-view';

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

describe('CartView — customization snapshots from server', () => {
  const baseLabels = {
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
    increaseQuantity: 'Aumentar cantidad',
    decreaseQuantity: 'Reducir cantidad',
    customizationDesignImageAlt: 'Diseño personalizado',
    price: 'Precio',
  };

  it('displays customization text, color, and size from server-enriched DTO', () => {
    const items = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        productImageUrl: null,
        sellerId: 'seller-1',
        sellerName: 'Test Seller',
        quantity: 1,
        unitPrice: 15,
        lineTotal: 15,
        customization: {
          text: 'My Design',
          color: 'Blue',
          size: 'L',
          imageUrl: null,
          imageUploadId: 'upload-123',
          colorImageUrl: null,
          designPosition: null,
        },
      },
    ];

    render(
      <CartView
        items={items}
        locale="es"
        isAuthenticated={true}
        labels={baseLabels}
      />,
    );

    expect(screen.getByText('Custom T-Shirt')).toBeTruthy();
    expect(screen.getByText(/My Design/)).toBeTruthy();
    expect(screen.getByText(/Blue/)).toBeTruthy();
    expect(screen.getByText(/L/)).toBeTruthy();
  });

  it('shows edit-personalization link when customizationEditFromCart label is provided', () => {
    const labels = {
      ...baseLabels,
      customizationEditFromCart: 'Editar personalización',
    };

    const items = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        productImageUrl: null,
        sellerId: 'seller-1',
        sellerName: 'Test Seller',
        quantity: 1,
        unitPrice: 15,
        lineTotal: 15,
        customization: {
          text: 'Hello',
          color: 'Red',
          size: 'M',
          imageUrl: '/img/design.png',
          imageUploadId: null,
          colorImageUrl: null,
          designPosition: null,
        },
      },
    ];

    render(
      <CartView
        items={items}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const link = screen.getByRole('link', {
      name: labels.customizationEditFromCart,
    });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/es/products/prod-1?');
    expect(link.getAttribute('href')).toContain('customizationText=Hello');
    expect(link.getAttribute('href')).toContain('customizationColor=Red');
  });

  it('does NOT show edit-personalization link when label is absent', () => {
    const items = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        productImageUrl: null,
        sellerId: 'seller-1',
        sellerName: 'Test Seller',
        quantity: 1,
        unitPrice: 15,
        lineTotal: 15,
        customization: {
          text: 'Hello',
          color: 'Red',
          size: 'M',
          imageUrl: null,
          imageUploadId: null,
          colorImageUrl: null,
          designPosition: null,
        },
      },
    ];

    render(
      <CartView
        items={items}
        locale="es"
        isAuthenticated={true}
        labels={baseLabels}
      />,
    );

    expect(screen.queryByRole('link', { name: /editar/i })).toBeNull();
  });

  it('passes imageUploadId through customization DTO to buildCustomizationHref', () => {
    const labels = {
      ...baseLabels,
      customizationEditFromCart: 'Editar personalización',
    };

    const items = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        productImageUrl: null,
        sellerId: 'seller-1',
        sellerName: 'Test Seller',
        quantity: 1,
        unitPrice: 15,
        lineTotal: 15,
        customization: {
          text: null,
          color: null,
          size: null,
          imageUrl: null,
          imageUploadId: 'upload-abc',
          colorImageUrl: null,
          designPosition: null,
        },
      },
    ];

    render(
      <CartView
        items={items}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const link = screen.getByRole('link', {
      name: labels.customizationEditFromCart,
    });
    expect(link.getAttribute('href')).toContain(
      'customizationImageUploadId=upload-abc',
    );
  });

  it('passes designPosition through customization DTO to buildCustomizationHref', () => {
    const labels = {
      ...baseLabels,
      customizationEditFromCart: 'Editar personalización',
    };

    const designPos = {
      imageUrl: '/img/design.png',
      x: 50,
      y: 60,
      scale: 1.2,
      rotation_deg: 0,
      opacity: 1,
      blend_mode: 'normal',
    };

    const items = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        productImageUrl: null,
        sellerId: 'seller-1',
        sellerName: 'Test Seller',
        quantity: 1,
        unitPrice: 15,
        lineTotal: 15,
        customization: {
          text: null,
          color: null,
          size: null,
          imageUrl: null,
          imageUploadId: null,
          colorImageUrl: null,
          designPosition: designPos,
        },
      },
    ];

    render(
      <CartView
        items={items}
        locale="es"
        isAuthenticated={true}
        labels={labels}
      />,
    );

    const link = screen.getByRole('link', {
      name: labels.customizationEditFromCart,
    });
    expect(link.getAttribute('href')).toContain('customizationDesignPosition=');
  });
});
