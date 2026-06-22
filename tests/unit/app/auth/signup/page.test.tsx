import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: 'es' }),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true, error: null }),
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: vi.fn().mockResolvedValue(null),
  })),
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
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', email: 'test@example.com' }),
    });
    global.fetch = fetchMock;

    render(<SignUpPage />);

    await user.type(screen.getByLabelText('Nombre'), 'John');
    await user.type(screen.getByLabelText('Apellido'), 'Doe');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'john@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(
      screen.getByLabelText('Confirmar contraseña'),
      'Password123',
    );

    // Expand address section
    await user.click(screen.getByText(/agregar dirección/i));

    await user.type(screen.getByLabelText('Calle'), '123 Main St');
    await user.type(screen.getByLabelText('Ciudad'), 'Madrid');
    await user.type(screen.getByLabelText('Código postal'), '28001');
    await user.type(screen.getByLabelText('País'), 'Spain');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await vi.waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

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

  it('shows validation error when firstName is empty', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(<SignUpPage />);

    await user.type(screen.getByLabelText('Apellido'), 'Doe');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'john@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(
      screen.getByLabelText('Confirmar contraseña'),
      'Password123',
    );

    const form = screen
      .getByRole('button', { name: 'Crear cuenta' })
      .closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('shows server error when email already exists (409)', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'User already exists' }),
    });
    global.fetch = fetchMock;

    render(<SignUpPage />);

    await user.type(screen.getByLabelText('Nombre'), 'John');
    await user.type(screen.getByLabelText('Apellido'), 'Doe');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'existing@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(
      screen.getByLabelText('Confirmar contraseña'),
      'Password123',
    );

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await vi.waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await vi.waitFor(
      () => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders confirmPassword field', () => {
    render(<SignUpPage />);

    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Apellido'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Different123!' },
    });

    const form = screen
      .getByRole('button', { name: 'Crear cuenta' })
      .closest('form')!;
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Las contraseñas no coinciden');
  });

  it('shows password strength indicator', () => {
    render(<SignUpPage />);

    expect(screen.getByText('Fortaleza de la contraseña')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('eye toggles on both password and confirmPassword fields', () => {
    render(<SignUpPage />);

    const passwordInput = screen.getByLabelText('Contraseña');
    const confirmInput = screen.getByLabelText('Confirmar contraseña');

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button', {
      name: /show password/i,
    });
    expect(toggleButtons).toHaveLength(2);

    fireEvent.click(toggleButtons[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButtons[1]);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'text');
  });
});
