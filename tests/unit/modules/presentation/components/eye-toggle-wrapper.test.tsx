import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EyeToggleWrapper } from '@/shared/ui/eye-toggle-wrapper';

describe('EyeToggleWrapper component', () => {
  it('renders with password input type by default', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows eye-off icon by default (password hidden)', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles to text input type when eye icon is clicked', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password type when clicked again', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('passes label prop through to Input', () => {
    render(
      <EyeToggleWrapper label="My Password" value="" onChange={() => {}} />,
    );
    expect(screen.getByText('My Password')).toBeInTheDocument();
  });

  it('passes value prop through to Input', () => {
    render(
      <EyeToggleWrapper
        label="Password"
        value="secret123"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveValue('secret123');
  });

  it('passes error prop through to Input', () => {
    render(
      <EyeToggleWrapper
        label="Password"
        value=""
        onChange={() => {}}
        error="Password is required"
      />,
    );
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('passes required prop through to Input', () => {
    render(
      <EyeToggleWrapper
        label="Password"
        value=""
        onChange={() => {}}
        required
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toBeRequired();
  });

  it('calls onChange with new value', () => {
    const onChange = vi.fn();
    render(<EyeToggleWrapper label="Password" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Password');
    fireEvent.change(input, { target: { value: 'newpass' } });
    expect(onChange).toHaveBeenCalledWith('newpass');
  });

  it('is keyboard accessible: Enter toggles visibility', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    toggleButton.focus();
    fireEvent.keyDown(toggleButton, { key: 'Enter' });
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('is keyboard accessible: Space toggles visibility', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    toggleButton.focus();
    fireEvent.keyDown(toggleButton, { key: ' ' });
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('changes aria-label between Show password and Hide password', () => {
    render(<EyeToggleWrapper label="Password" value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
  });
});
