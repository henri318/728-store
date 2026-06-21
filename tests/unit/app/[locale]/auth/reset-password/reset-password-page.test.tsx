import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from '@/app/[locale]/auth/reset-password/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSearchParams, useRouter } from 'next/navigation';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('token=valid-token'),
    );
  });

  it('renders new password form', () => {
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('shows error when no token present', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(''));

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(
        screen.getByText('El enlace ha expirado. Solicitá uno nuevo.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(
        screen.getByText('Las contraseñas no coinciden'),
      ).toBeInTheDocument();
    });
  });

  it('calls reset-password API on valid submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('redirects after successful reset', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'newpass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
