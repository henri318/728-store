import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderItemPreview } from '@/modules/orders/presentation/components/order-item-preview';

vi.mock('@/modules/presentation/components/design-preview', () => ({
  DesignPreview: () => <canvas data-testid="design-preview" />,
}));

describe('OrderItemPreview', () => {
  it('falls back to the saved design image when the product image is unavailable', () => {
    render(
      <OrderItemPreview
        productImageUrl={null}
        designImageUrl="https://cdn.example.com/design.png"
        designPosition={null}
        productName="Custom shirt"
      />,
    );

    const image = screen.getByRole('img', { name: 'Custom shirt' });
    expect(image).toHaveAttribute('src', 'https://cdn.example.com/design.png');
  });
});
