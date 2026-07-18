import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '@/app/[locale]/auth/verify-email/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useSearchParams } from 'next/navigation';

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success when token is valid', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('token=valid-token') as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Email verified' }),
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Correo electrónico verificado correctamente'),
      ).toBeInTheDocument();
    });
  });

  it('shows error when token is invalid', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('token=bad-token') as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid or expired token' }),
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('El enlace ha expirado. Solicita uno nuevo.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error when no token in URL', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('') as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('El enlace de verificación no es válido.'),
      ).toBeInTheDocument();
    });
  });

  it('aborts an obsolete token request when the token changes', async () => {
    let firstSignal: AbortSignal | undefined;
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('token=first') as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    mockFetch
      .mockImplementationOnce((_url: string, options?: RequestInit) => {
        firstSignal = options?.signal ?? undefined;
        return new Promise(() => {});
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { rerender } = render(<VerifyEmailPage />);
    await waitFor(() => expect(firstSignal).toBeDefined());
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('token=second') as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    rerender(<VerifyEmailPage />);

    await waitFor(() => {
      expect(firstSignal?.aborted).toBe(true);
      expect(
        screen.getByText('Correo electrónico verificado correctamente'),
      ).toBeInTheDocument();
    });
  });
});
