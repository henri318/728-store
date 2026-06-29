import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const assertRoleMock = vi.fn(async () => undefined);
  const getDictionaryMock = vi.fn();
  const getSellerRepositoryMock = vi.fn();

  return {
    assertRoleMock,
    getDictionaryMock,
    getSellerRepositoryMock,
  };
});

vi.mock('@/shared/authorization/authorization', () => ({
  assertRole: mocks.assertRoleMock,
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getSellerRepository: mocks.getSellerRepositoryMock,
  },
}));

vi.mock('@/app/[locale]/admin/sellers/seller-actions', () => ({
  SellerActions: ({
    sellerId,
    currentStatus,
  }: {
    sellerId: string;
    currentStatus: string;
  }) => <span data-testid={`actions-${sellerId}`}>{currentStatus}</span>,
}));

vi.mock('@/app/[locale]/admin/sellers/seller-delete', () => ({
  SellerDelete: ({ sellerId }: { sellerId: string; sellerName: string }) => (
    <span data-testid={`delete-${sellerId}`}>Delete</span>
  ),
}));

// Import after mocks
import AdminSellersPage from '@/app/[locale]/admin/sellers/page';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

function makeSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: 'A test shop',
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeDict() {
  return {
    admin: {
      sellersTitle: 'Gestión de vendedores',
      noSellers: 'No se encontraron vendedores',
      sellerName: 'Nombre',
      sellerDescriptionList: 'Descripción',
      sellerStatus: 'Estado',
      sellerCreated: 'Creado',
      actions: 'Acciones',
      viewProducts: 'Ver productos',
      suspend: 'Suspender',
      activate: 'Activar',
      ban: 'Banear',
      status_active: 'Activo',
      status_suspended: 'Suspendido',
      status_banned: 'Baneado',
      createSeller: 'Crear vendedor',
      pagePrev: '← Anterior',
      pageNext: 'Siguiente →',
      pageXofY: 'Página {current} de {total}',
      delete: 'Eliminar',
      searchSellers: 'Buscar vendedores',
      searchSellersPlaceholder: 'Buscar vendedores...',
    },
    common: {
      loading: 'Cargando...',
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('AdminSellersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue(makeDict());
  });

  it('renders empty state when no sellers match', async () => {
    mocks.getSellerRepositoryMock.mockReturnValue(new MemorySellerRepository());

    const element = await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(
      screen.getByText('No se encontraron vendedores'),
    ).toBeInTheDocument();
  });

  it('passes searchParams to the use case', async () => {
    const repo = new MemorySellerRepository();
    const spy = vi.spyOn(repo, 'findPaginated');
    mocks.getSellerRepositoryMock.mockReturnValue(repo);

    await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({
        page: '2',
        pageSize: '15',
        q: 'camisa',
        sortBy: 'name',
        sortDir: 'asc',
      }),
    });

    expect(spy).toHaveBeenCalledWith({
      page: 2,
      pageSize: 15,
      q: 'camisa',
      sortBy: 'name',
      sortDir: 'asc',
    });
  });

  it('renders the search form and preserves an existing query', async () => {
    mocks.getSellerRepositoryMock.mockReturnValue(new MemorySellerRepository());

    const element = await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({ q: 'tienda' }),
    });
    render(element);

    const searchbox = screen.getByRole('searchbox', {
      name: 'Buscar vendedores',
    });
    expect(searchbox).toHaveValue('tienda');
    expect(searchbox).toHaveAttribute('placeholder', 'Buscar vendedores...');
    expect(
      screen.getByRole('button', { name: 'Buscar vendedores' }),
    ).toBeInTheDocument();
  });

  it('renders pagination info and navigation links', async () => {
    const repo = new MemorySellerRepository();
    for (let i = 1; i <= 25; i++) {
      repo.seed(
        makeSeller({
          sellerId: SellerId.create(`seller-${i}`),
          name: `Shop ${String.fromCharCode(64 + i)}`,
          createdAt: new Date(`2025-01-${String(i).padStart(2, '01')}`),
        }),
      );
    }
    mocks.getSellerRepositoryMock.mockReturnValue(repo);

    const element = await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({ page: '2' }),
    });
    render(element);

    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Siguiente →')).toBeInTheDocument();
    expect(screen.getByText('← Anterior')).toBeInTheDocument();
  });

  it('disables previous link on first page', async () => {
    const repo = new MemorySellerRepository();
    repo.seed(makeSeller({ sellerId: SellerId.create('s1'), name: 'Shop A' }));
    mocks.getSellerRepositoryMock.mockReturnValue(repo);

    const element = await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByText('← Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente →')).toBeInTheDocument();
  });

  it('renders sellers with their statuses', async () => {
    const repo = new MemorySellerRepository();
    repo.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Active Shop',
        status: SellerStatus.ACTIVE,
      }),
    );
    repo.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Suspended Shop',
        status: SellerStatus.SUSPENDED,
      }),
    );
    mocks.getSellerRepositoryMock.mockReturnValue(repo);

    const element = await AdminSellersPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByText('Active Shop')).toBeInTheDocument();
    expect(screen.getByText('Suspended Shop')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-s1')).toHaveAttribute(
      'data-status',
      'active',
    );
    expect(screen.getByTestId('status-badge-s2')).toHaveAttribute(
      'data-status',
      'suspended',
    );
  });
});
