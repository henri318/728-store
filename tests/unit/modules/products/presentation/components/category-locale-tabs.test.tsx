import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryLocaleTabs } from '@/modules/products/presentation/components/category-locale-tabs';

describe('CategoryLocaleTabs', () => {
  it('renders both locale tabs and reports selection', () => {
    const onChange = vi.fn();
    render(
      <CategoryLocaleTabs
        value="es"
        onChange={onChange}
        labels={{ es: 'Español', cat: 'Català' }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Català' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Català' }));
    expect(onChange).toHaveBeenCalledWith('cat');
  });
});
