import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserMenuDropdown } from '@/modules/presentation/components/user-menu-dropdown';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'es' }),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

import { signOut } from 'next-auth/react';

function openDropdownAndClickDelete() {
  const trigger = screen.getByRole('button', { name: /menu/i });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('menuitem', { name: /eliminar cuenta/i }));
}

describe('UserMenuDropdown component', () => {
  const mockUser = { name: 'John Doe', email: 'john@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens dropdown on click', () => {
    render(<UserMenuDropdown user={mockUser} />);

    expect(screen.queryByRole('menu')).toBeNull();

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows 4 menu items: profile, changePassword, deleteAccount, closeSession', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /editar contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /eliminar cuenta/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('click outside closes dropdown', () => {
    render(
      <div data-testid="outside">
        <UserMenuDropdown user={mockUser} />
      </div>
    );

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape closes dropdown', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls signOut when closeSession is clicked', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/es' });
  });

  it('renders profile link to /profile', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    const profileLink = screen.getByRole('menuitem', { name: /mi perfil/i });
    expect(profileLink).toHaveAttribute('href', '/es/profile');
  });

  it('renders changePassword link to /auth/change-password', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    const changePasswordLink = screen.getByRole('menuitem', { name: /editar contraseña/i });
    expect(changePasswordLink).toHaveAttribute('href', '/es/auth/change-password');
  });

  // ── Delete account tests ──

  it('calls signOut with callbackUrl on successful delete', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<UserMenuDropdown user={mockUser} />);
    openDropdownAndClickDelete();

    const confirmButton = screen.getByRole('button', { name: /eliminar cuenta/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/es' });
    });
  });

  it('shows error message on failed delete', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cannot delete admin account' }),
    });

    render(<UserMenuDropdown user={mockUser} />);
    openDropdownAndClickDelete();

    const confirmButton = screen.getByRole('button', { name: /eliminar cuenta/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Cannot delete admin account');
    });
  });

  it('clears error message when modal is closed', async () => {
    // First: trigger a failed delete to show error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cannot delete admin account' }),
    });

    render(<UserMenuDropdown user={mockUser} />);
    openDropdownAndClickDelete();

    const confirmButton = screen.getByRole('button', { name: /eliminar cuenta/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Close the modal
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });

    // Reopen delete modal — error should still be cleared
    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /eliminar cuenta/i }));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
