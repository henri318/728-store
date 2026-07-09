import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';

const refreshMock = vi.fn();

const mocks = vi.hoisted(() => {
  const requireAdminMock = vi.fn(async () => {});
  const getDictionaryMock = vi.fn();
  const getCategoryRepositoryMock = vi.fn();

  return {
    requireAdminMock,
    getDictionaryMock,
    getCategoryRepositoryMock,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/shared/authorization/require-admin', () => ({
  requireAdmin: mocks.requireAdminMock,
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getCategoryRepository: mocks.getCategoryRepositoryMock,
  },
}));

import AdminConfigurationPage from '@/app/[locale]/admin/configuration/page';

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    parentId: null,
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    ...overrides,
  };
}

function makeDict() {
  return {
    common: {
      remove: 'Eliminar',
      required: 'Este campo es obligatorio',
      genericError: 'Algo salió mal. Inténtalo de nuevo.',
    },
    userMenu: {
      dashboard: 'Panel de administración',
      configuration: 'Configuración',
    },
    admin: {
      configuration: {
        title: 'Configuración',
        description: 'Gestiona las categorías del catálogo.',
        label: 'Categorías',
        placeholder: 'Escribe una categoría y pulsa Enter',
        addLabel: 'Añadir',
        emptyLabel: 'Todavía no hay categorías',
        delete: 'Eliminar',
        createError: 'No se pudo crear la categoría',
        deleteError: 'No se pudo eliminar la categoría',
        validationError: 'Introduce un nombre válido',
        duplicateError: 'Ya existe una categoría con ese nombre',
        inUseError: 'La categoría está en uso',
      },
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('AdminConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshMock.mockClear();
    mocks.requireAdminMock.mockResolvedValue(undefined);
    mocks.getDictionaryMock.mockResolvedValue(makeDict());
  });

  it('renders the sorted category list and creates a new category', async () => {
    const repo = {
      findAllSorted: vi.fn(async () => [
        makeCategory({ id: 'cat-2', name: 'Books', slug: 'books' }),
        makeCategory(),
      ]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === '/api/admin/categories' && init?.method === 'POST') {
          const body = JSON.parse(String(init.body ?? '{}')) as {
            name: string;
          };
          return Response.json(
            {
              id: 'cat-3',
              name: body.name.trim(),
              slug: 'home-decor',
              parentId: null,
              createdAt: new Date('2026-07-09T00:10:00.000Z').toISOString(),
            },
            { status: 201 },
          );
        }

        if (
          url.includes('/api/admin/categories/') &&
          init?.method === 'DELETE'
        ) {
          return Response.json({}, { status: 200 });
        }

        return Response.json({}, { status: 200 });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const element = await AdminConfigurationPage({
      params: Promise.resolve({ locale: 'es' }),
    });
    render(element);

    expect(mocks.requireAdminMock).toHaveBeenCalledWith('es');
    expect(
      screen.getByRole('heading', { name: 'Configuración' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Categorías'), {
      target: { value: 'Home Decor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/categories',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(await screen.findByText('Home Decor')).toBeInTheDocument();
  });

  it('blocks in-use category deletion', async () => {
    const repo = {
      findAllSorted: vi.fn(async () => [
        makeCategory({ name: 'Housewares', slug: 'housewares' }),
      ]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (
          url.includes('/api/admin/categories/') &&
          init?.method === 'DELETE'
        ) {
          return Response.json(
            { error: 'Category is in use' },
            { status: 409 },
          );
        }

        return Response.json({}, { status: 200 });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const element = await AdminConfigurationPage({
      params: Promise.resolve({ locale: 'es' }),
    });
    render(element);

    fireEvent.click(
      screen.getByRole('button', { name: 'Eliminar Housewares' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La categoría está en uso',
      );
    });
    expect(screen.getByText('Housewares')).toBeInTheDocument();
  });

  it('shows the empty state when no categories exist', async () => {
    const repo = {
      findAllSorted: vi.fn(async () => []),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const element = await AdminConfigurationPage({
      params: Promise.resolve({ locale: 'es' }),
    });
    render(element);

    expect(screen.getByText('Todavía no hay categorías')).toBeInTheDocument();
    expect(screen.getByLabelText('Categorías')).toBeInTheDocument();
  });
});
