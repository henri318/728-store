import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '@/modules/presentation/components/password-strength-indicator';

describe('PasswordStrengthIndicator component', () => {
  it('shows 0/3 criteria with all crosses for empty password', () => {
    render(<PasswordStrengthIndicator password="" />);
    expect(screen.getByText('0/3')).toBeInTheDocument();
    expect(screen.getByText(/Fortaleza de la contraseña/i)).toBeInTheDocument();
    const crosses = screen.getAllByText(/✗/);
    expect(crosses).toHaveLength(3);
  });

  it('shows 1/3 with hasLetters ✓ for password with only letters', () => {
    render(<PasswordStrengthIndicator password="abcdef" />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    const checks = screen.getAllByText(/✓/);
    expect(checks).toHaveLength(1);
    const crosses = screen.getAllByText(/✗/);
    expect(crosses).toHaveLength(2);
  });

  it('shows 2/3 with hasLetters ✓ and hasNumbers ✓ for letters + numbers', () => {
    render(<PasswordStrengthIndicator password="abc123" />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    const checks = screen.getAllByText(/✓/);
    expect(checks).toHaveLength(2);
    const crosses = screen.getAllByText(/✗/);
    expect(crosses).toHaveLength(1);
  });

  it('shows 3/3 with all ✓ for password meeting all criteria', () => {
    render(<PasswordStrengthIndicator password="abc123!" />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
    const checks = screen.getAllByText(/✓/);
    expect(checks).toHaveLength(3);
  });

  it('recognizes special characters like !@#$%^&*()_+', () => {
    render(<PasswordStrengthIndicator password="pass1!@#$" />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
    const checks = screen.getAllByText(/✓/);
    expect(checks).toHaveLength(3);
  });

  it('updates in real-time as password changes', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="a" />);
    expect(screen.getByText('1/3')).toBeInTheDocument();

    rerender(<PasswordStrengthIndicator password="a1" />);
    expect(screen.getByText('2/3')).toBeInTheDocument();

    rerender(<PasswordStrengthIndicator password="a1!" />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('shows progress bar with 0% for empty password', () => {
    render(<PasswordStrengthIndicator password="" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows progress bar with ~33% for letters only', () => {
    render(<PasswordStrengthIndicator password="abc" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });

  it('shows progress bar with ~67% for letters + numbers', () => {
    render(<PasswordStrengthIndicator password="abc123" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '67');
  });

  it('shows progress bar with 100% for all criteria met', () => {
    render(<PasswordStrengthIndicator password="abc123!" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('displays criteria labels from dictionary', () => {
    render(<PasswordStrengthIndicator password="" />);
    expect(screen.getByText(/Tiene números/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiene letras/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Tiene caracteres especiales/i),
    ).toBeInTheDocument();
  });
});
