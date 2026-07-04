import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'es' }),
  useRouter: () => ({ push: mockPush }),
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

    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
  });

  it('submits and redirects CUSTOMER to home', async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: '',
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { role: 'CUSTOMER' } }),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'user@test.com',
        password: 'pass123',
        redirect: false,
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es');
    });
  });

  it('redirects DESIGNER to seller/products', async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: '',
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { role: 'DESIGNER' } }),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'designer@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/seller/products');
    });
  });

  it('redirects ADMIN to admin/sellers', async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: '',
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { role: 'ADMIN' } }),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/admin/sellers');
    });
  });

  it('renders link to signup page', () => {
    render(<SignInPage />);

    const signupLink = screen.getByRole('link', { name: /crear cuenta/i });
    expect(signupLink).toHaveAttribute('href', '/es/auth/signup');
  });
});
