import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleNavLinks } from '@/modules/presentation/components/role-nav-links';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'es' }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('RoleNavLinks component', () => {
  it('renders Dashboard link for ADMIN role', () => {
    render(<RoleNavLinks role="ADMIN" locale="es" />);

    const link = screen.getByRole('link', { name: /panel de administración/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/es/admin/sellers');
  });

  it('renders Designer Panel link for DESIGNER role', () => {
    render(<RoleNavLinks role="DESIGNER" locale="es" />);

    const link = screen.getByRole('link', { name: /panel de diseñador/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/es/seller/products');
  });

  it('renders nothing for CUSTOMER role', () => {
    const { container } = render(<RoleNavLinks role="CUSTOMER" locale="es" />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for SUPPORT role', () => {
    const { container } = render(<RoleNavLinks role="SUPPORT" locale="es" />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when role is null', () => {
    const { container } = render(<RoleNavLinks role={null} locale="es" />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when role is undefined', () => {
    const { container } = render(<RoleNavLinks role={undefined} locale="es" />);

    expect(container.innerHTML).toBe('');
  });

  it('uses the provided locale for link href', () => {
    render(<RoleNavLinks role="ADMIN" locale="cat" />);

    const link = screen.getByRole('link', { name: /panel de administración/i });
    expect(link).toHaveAttribute('href', '/cat/admin/sellers');
  });
});
