import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const baseProfileResponse = {
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
};

type ProfileResponse = Omit<typeof baseProfileResponse, 'address'> & {
  address: typeof baseProfileResponse.address | null;
};

const mockAuthenticatedSession = (role: string) => {
  mockUseSession.mockReturnValue({
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'John Doe',
        role,
        emailVerified: null,
      },
      expires: '2099-01-01T00:00:00.000Z',
    },
    status: 'authenticated',
    update: vi.fn(),
  });
};

const mockProfileFetch = (profile: Partial<ProfileResponse> = {}) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      ...baseProfileResponse,
      ...profile,
    }),
  });
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedSession('user');
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ProfilePage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('fetches and displays user profile data', async () => {
    mockProfileFetch();
    mockAuthenticatedSession('CUSTOMER');

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('John');
      expect(screen.getByLabelText('Apellido')).toHaveValue('Doe');
      expect(screen.getByLabelText('Calle')).toHaveValue('123 Main St');
      expect(screen.getByLabelText('Ciudad')).toHaveValue('Barcelona');
    });
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

  it('displays delete account button', async () => {
    mockProfileFetch({ address: null });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Eliminar cuenta' }),
      ).toBeInTheDocument();
    });
  });

  // ── Auth guard tests ──

  it('redirects to signin when unauthenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

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
    });

    render(<ProfilePage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('shows profile form when authenticated', async () => {
    mockProfileFetch();
    mockAuthenticatedSession('CUSTOMER');

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('John');
    });
  });

  // ── Address guard tests ──

  it('shows address section for CUSTOMER role', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...baseProfileResponse,
        email: 'customer@test.com',
        firstName: 'Jane',
        address: {
          street: '456 Oak Ave',
          city: 'Madrid',
          postalCode: '28001',
          country: 'Spain',
        },
      }),
    });

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'customer@test.com',
          name: 'Jane Doe',
          role: 'CUSTOMER',
          emailVerified: null,
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calle')).toHaveValue('456 Oak Ave');
      expect(screen.getByLabelText('Ciudad')).toHaveValue('Madrid');
    });
  });

  it.each(['SUPPORT', 'DESIGNER'] as const)(
    'hides address section for %s role even when API returns address data',
    async (role) => {
      mockProfileFetch({
        email: `${role.toLowerCase()}@test.com`,
        firstName: role,
        lastName: 'User',
      });
      mockAuthenticatedSession(role);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Nombre')).toHaveValue(role);
      });

      for (const label of ['Calle', 'Ciudad', 'Código postal', 'País']) {
        expect(screen.queryByLabelText(label)).toBeNull();
      }
    },
  );
});
