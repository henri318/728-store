import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaveTransition } from '@/shared/presentation/components/wave-transition';

describe('WaveTransition', () => {
  it('renders the default wave text for users', () => {
    render(<WaveTransition />);

    expect(screen.getByText(/DETALLES QUE DEJAN HUELLA/i)).toBeInTheDocument();
  });
});
