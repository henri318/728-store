import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathnameMock,
}));

vi.mock('next-auth/react', () => ({
  useSession: mocks.useSessionMock,
}));

vi.mock('@/shared/layout/login-modal', () => ({
  LoginModal: () => null,
}));

vi.mock('@/shared/layout/user-menu-dropdown', () => ({
  UserMenuDropdown: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/shared/layout/role-nav-links', () => ({
  RoleNavLinks: () => null,
}));

vi.mock('@/modules/cart/presentation/components/cart-icon', () => ({
  CartIcon: () => null,
}));

import { HeaderNav } from '@/shared/layout/header-nav';

describe('HeaderNav', () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReturnValue('/cat');
    mocks.useSessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('links every public visitor to the localized about page', () => {
    render(
      <HeaderNav
        loginLabel="Iniciar sesión"
        profileAlt="Perfil"
        cartAlt="Carrito"
        aboutLabel="Quiénes somos"
      />,
    );

    expect(screen.getByRole('link', { name: 'Quiénes somos' })).toHaveAttribute(
      'href',
      '/cat/quienes-somos',
    );
  });
});
