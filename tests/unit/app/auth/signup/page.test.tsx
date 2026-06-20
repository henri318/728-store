import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: 'es' }),
}));

import SignUpPage from '@/app/[locale]/auth/signup/page';

describe('SignUpPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('renders firstName, lastName, email, password fields — NOT a single "name" field', () => {
    render(<SignUpPage />);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();

    // The old "Name" field must NOT exist
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('renders address fields (street, city, postalCode, country) when expanded', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.click(screen.getByText(/agregar dirección/i));

    expect(screen.getByLabelText('Calle')).toBeInTheDocument();
    expect(screen.getByLabelText('Ciudad')).toBeInTheDocument();
    expect(screen.getByLabelText('Código postal')).toBeInTheDocument();
    expect(screen.getByLabelText('País')).toBeInTheDocument();
  });

  it('sends { firstName, lastName, email, password, address } to /api/auth/signup', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', email: 'test@example.com' }),
    });
    global.fetch = fetchMock;

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Password123' } });

    // Expand address section
    fireEvent.click(screen.getByText(/agregar dirección/i));

    fireEvent.change(screen.getByLabelText('Calle'), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText('Ciudad'), { target: { value: 'Madrid' } });
    fireEvent.change(screen.getByLabelText('Código postal'), { target: { value: '28001' } });
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'Spain' } });

    const form = screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!;
    fireEvent.submit(form);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    }, { timeout: 3000 });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/signup');

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123',
      address: {
        street: '123 Main St',
        city: 'Madrid',
        postalCode: '28001',
        country: 'Spain',
      },
    });
  });

  it('shows validation error when firstName is empty', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Password123' } });

    const form = screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!;
    fireEvent.submit(form);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows server error when email already exists (409)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'User already exists' }),
    });
    global.fetch = fetchMock;

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Password123' } });

    const form = screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!;
    fireEvent.submit(form);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    }, { timeout: 3000 });

    await vi.waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
