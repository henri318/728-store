import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProductDetailError from '@/app/[locale]/products/[id]/error';

describe('ProductDetailError', () => {
  it('shows a safe recovery message without exposing the underlying error', () => {
    const reset = vi.fn();

    render(
      <ProductDetailError
        error={new Error('PostgreSQL connection refused')}
        reset={reset}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Algo no funciona' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Estamos tratando de arreglarlo. Intentá de nuevo en unos instantes.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/PostgreSQL connection refused/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
