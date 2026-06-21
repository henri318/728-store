import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from '@/app/[locale]/auth/forgot-password/page';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email form', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enviar enlace de recuperación' }),
    ).toBeInTheDocument();
  });

  it('shows anti-enumeration message after submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Enviar enlace de recuperación' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Si el correo existe, recibirás un enlace de recuperación.',
        ),
      ).toBeInTheDocument();
    });
  });
});
