import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { signIn } from 'next-auth/react';

import SignInPage from '@/app/[locale]/auth/signin/page';

describe('SignInPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('renders i18n labels: signInTitle, email, password, loginButton', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('password field uses EyeToggleWrapper (has show/hide toggle)', () => {
    render(<SignInPage />);

    const passwordInput = screen.getByLabelText('Contraseña');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('submits form with email and password via signIn', async () => {
    const mockSignIn = vi.mocked(signIn).mockResolvedValue({ ok: true, error: null } as any);

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'user@test.com',
        password: 'pass123',
        callbackUrl: '/',
      });
    });
  });

  it('renders link to signup page', () => {
    render(<SignInPage />);

    const signupLink = screen.getByRole('link', { name: /crear cuenta/i });
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });
});
