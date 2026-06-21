import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/modules/presentation/components/input';

describe('Input component', () => {
  it('renders with label text', () => {
    render(<Input label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders the input element with the provided value', () => {
    render(<Input label="Name" value="John" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('John');
  });

  it('calls onChange when the user types', () => {
    const onChange = vi.fn();
    render(<Input label="Email" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('test@example.com');
  });

  it('shows error styling and message when error prop is provided', () => {
    render(
      <Input
        label="Email"
        value=""
        onChange={() => {}}
        error="Invalid email"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show error when error prop is undefined', () => {
    render(<Input label="Email" value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('accepts HTML input type prop', () => {
    render(
      <Input label="Password" value="" onChange={() => {}} type="password" />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('accepts placeholder prop', () => {
    render(
      <Input
        label="City"
        value=""
        onChange={() => {}}
        placeholder="Enter your city"
      />,
    );
    const input = screen.getByPlaceholderText('Enter your city');
    expect(input).toBeInTheDocument();
  });

  it('passes required prop to the input element', () => {
    render(<Input label="Email" value="" onChange={() => {}} required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });
});
