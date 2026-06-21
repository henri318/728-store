import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenuDropdown } from '@/modules/presentation/components/user-menu-dropdown';

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

  it('shows 3 menu items: profile, changePassword, closeSession', () => {
    render(<UserMenuDropdown user={mockUser} />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /editar contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeInTheDocument();

    // Delete account should NOT be in the dropdown
    expect(screen.queryByRole('menuitem', { name: /eliminar cuenta/i })).toBeNull();
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
});
