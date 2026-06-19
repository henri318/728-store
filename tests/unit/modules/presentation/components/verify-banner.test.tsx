import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerifyBanner } from '@/modules/presentation/components/verify-banner';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('VerifyBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders yellow banner with verify message', () => {
    render(<VerifyBanner email="test@example.com" />);

    expect(screen.getByText('Por favor, verificá tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar verificación' })).toBeInTheDocument();
  });

  it('calls resend API when button clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<VerifyBanner email="test@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar verificación' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify-email', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('shows success message after resend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<VerifyBanner email="test@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar verificación' }));

    await waitFor(() => {
      expect(screen.getByText('Correo electrónico verificado correctamente')).toBeInTheDocument();
    });
  });
});
