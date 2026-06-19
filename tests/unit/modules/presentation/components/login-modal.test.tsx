import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginModal } from '@/modules/presentation/components/login-modal';

// Mock next-auth/react signIn
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { signIn } from 'next-auth/react';

describe('LoginModal component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields inside a modal when open', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('calls signIn with credentials when form is submitted', async () => {
    const mockSignIn = vi.mocked(signIn).mockResolvedValue({ ok: true, error: null } as any);

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña');
    const submitButton = screen.getByRole('button', { name: 'Iniciar sesión' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: '/',
        redirect: false,
      });
    });
  });

  it('shows error message when signIn returns error', async () => {
    const mockSignIn = vi.mocked(signIn).mockResolvedValue({ ok: false, error: 'CredentialsSignin' } as any);

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña');
    const submitButton = screen.getByRole('button', { name: 'Iniciar sesión' });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const mockSignIn = vi.mocked(signIn).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Loading...' });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render modal content when isOpen is false', () => {
    render(<LoginModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByRole('heading', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull();
  });

  it('closes modal after successful login', async () => {
    const mockSignIn = vi.mocked(signIn).mockResolvedValue({ ok: true, error: null } as any);

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
