import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '@/modules/presentation/components/error-message';

describe('ErrorMessage component', () => {
  it('renders the error message text when message prop is provided', () => {
    render(<ErrorMessage message="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This field is required',
    );
  });

  it('renders nothing when message is undefined', () => {
    const { container } = render(<ErrorMessage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when message is an empty string', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('has alert role for accessibility', () => {
    render(<ErrorMessage message="Invalid input" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
