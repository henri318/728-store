import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginModal } from '@/modules/presentation/components/login-modal';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: vi.fn().mockResolvedValue(null),
  })),
}));

import { signIn } from 'next-auth/react';

describe('LoginModal component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields inside a modal when open', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
  });

  it('calls signIn with credentials when form is submitted', async () => {
    const mockSignIn = vi
      .mocked(signIn)
      .mockResolvedValue({ ok: true, error: null });

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
        redirect: false,
      });
    });
  });

  it('shows loading state during submission', async () => {
    vi.mocked(signIn).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Loading...' });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /cerrar/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders registration link', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const registerLink = screen.getByText(/no tenés cuenta/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/auth/signup');
  });

  it('does not render modal content when isOpen is false', () => {
    render(<LoginModal isOpen={false} onClose={mockOnClose} />);

    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeNull();
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull();
  });

  it('closes modal after successful login', async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true, error: null });

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('password field has eye toggle that shows/hides password', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const passwordInput = screen.getByLabelText('Contraseña');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('does not close modal when clicking backdrop', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    const backdrop = screen.getByTestId('modal-overlay');
    fireEvent.click(backdrop);

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
