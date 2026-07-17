import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from '@/app/[locale]/profile/profile-form';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const profile = {
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  address: {
    street: '123 Main St',
    city: 'Barcelona',
    postalCode: '08001',
    country: 'Spain',
  },
};

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the server-loaded customer profile', () => {
    render(<ProfileForm locale="es" profile={profile} role="CUSTOMER" />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('John');
    expect(screen.getByLabelText('Apellido')).toHaveValue('Doe');
    expect(screen.getByLabelText('Calle')).toHaveValue('123 Main St');
  });

  it('hides address fields for non-customer roles', () => {
    render(<ProfileForm locale="es" profile={profile} role="DESIGNER" />);

    expect(screen.queryByLabelText('Calle')).toBeNull();
  });

  it('preserves profile PATCH mutations', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<ProfileForm locale="es" profile={profile} role="CUSTOMER" />);

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Jane');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"firstName":"Jane"'),
    });
  });

  it('sends an explicit address deletion after clearing an existing address', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<ProfileForm locale="es" profile={profile} role="CUSTOMER" />);

    await user.clear(screen.getByLabelText('Calle'));
    await user.clear(screen.getByLabelText('Código postal'));
    await user.clear(screen.getByLabelText('Ciudad'));
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"address":null'),
    });
  });

  it('preserves profile DELETE mutations', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete account' }),
    });
    render(<ProfileForm locale="es" profile={profile} role="CUSTOMER" />);

    await user.click(screen.getByRole('button', { name: 'Eliminar cuenta' }));
    await user.click(
      screen.getAllByRole('button', { name: 'Eliminar cuenta' })[1],
    );

    expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
      method: 'DELETE',
    });
  });
});
