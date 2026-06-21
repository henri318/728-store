import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/[locale]/profile/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: 'es' }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { useSession } from 'next-auth/react';

const mockUseSession = vi.mocked(useSession);

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com', name: 'John Doe' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any);
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ProfilePage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('fetches and displays user profile data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        address: {
          street: '123 Main St',
          city: 'Barcelona',
          postalCode: '08001',
          country: 'Spain',
        },
        emailVerified: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('John');
    });
    expect(screen.getByLabelText('Apellido')).toHaveValue('Doe');
    expect(screen.getByLabelText('Calle')).toHaveValue('123 Main St');
    expect(screen.getByLabelText('Ciudad')).toHaveValue('Barcelona');
  });

  it('shows error message when GET fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  it('saves profile changes via PATCH', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        address: null,
        emailVerified: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('John');
    });

    // Mock the PATCH response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', firstName: 'Jane', lastName: 'Doe', address: null }),
    });

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me', expect.objectContaining({
        method: 'PATCH',
      }));
    });
  });

  it('displays delete account button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe',
        address: null, emailVerified: null, createdAt: '2025-01-01T00:00:00.000Z',
      }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Eliminar cuenta' })).toBeInTheDocument();
    });
  });

  // ── Auth guard tests ──

  it('redirects to signin when unauthenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    } as any);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/auth/signin');
    });
  });

  it('shows loading state when session status is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    } as any);

    render(<ProfilePage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('shows profile form when authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        address: { street: '123 Main St', city: 'Barcelona', postalCode: '08001', country: 'Spain' },
        emailVerified: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    });

    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com', name: 'John Doe' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('John');
    });
  });
});
