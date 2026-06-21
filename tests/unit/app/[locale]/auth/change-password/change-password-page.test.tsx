import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordPage from '@/app/[locale]/auth/change-password/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: 'es' }),
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSession } from 'next-auth/react';

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          emailVerified: null,
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    });
  });

  it('renders password change form', () => {
    render(<ChangePasswordPage />);

    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'different' },
    });

    const form = screen
      .getByRole('button', { name: 'Enviar' })
      .closest('form')!;
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Las contraseñas no coinciden');
  });

  it('calls change-password API when form is valid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'oldpass' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpass123' },
    });

    const form = screen
      .getByRole('button', { name: 'Enviar' })
      .closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/me/change-password',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('shows success message after successful change', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'oldpass' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpass123' },
    });

    const form = screen
      .getByRole('button', { name: 'Enviar' })
      .closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('Contraseña actualizada correctamente'),
      ).toBeInTheDocument();
    });
  });

  it('eye toggles on all 3 password fields', () => {
    render(<ChangePasswordPage />);

    const currentInput = screen.getByLabelText('Contraseña actual');
    const newInput = screen.getByLabelText('Nueva contraseña');
    const confirmInput = screen.getByLabelText('Confirmar contraseña');

    expect(currentInput).toHaveAttribute('type', 'password');
    expect(newInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button', {
      name: /show password/i,
    });
    expect(toggleButtons).toHaveLength(3);

    fireEvent.click(toggleButtons[0]);
    expect(currentInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButtons[1]);
    expect(newInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButtons[2]);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('shows password strength indicator on newPassword field', () => {
    render(<ChangePasswordPage />);

    expect(screen.getByText('Fortaleza de la contraseña')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // ── Auth guard tests ──

  it('redirects to signin when unauthenticated', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    render(<ChangePasswordPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/auth/signin');
    });
  });

  it('shows loading state when session status is loading', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    });

    render(<ChangePasswordPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    // Form should not be rendered
    expect(screen.queryByLabelText('Contraseña actual')).toBeNull();
  });

  it('shows form when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          emailVerified: null,
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<ChangePasswordPage />);

    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });
});
