import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProductLocaleTabs } from '@/modules/products/presentation/components/product-locale-tabs';

describe('ProductLocaleTabs', () => {
  it('renders both locales and switches active tab', () => {
    const onChange = vi.fn();

    render(
      <ProductLocaleTabs
        value="es"
        onChange={onChange}
        labels={{ es: 'ES', cat: 'CAT' }}
      />,
    );

    expect(screen.getByRole('tab', { name: 'ES' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'CAT' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'CAT' }));

    expect(onChange).toHaveBeenCalledWith('cat');
  });
});
