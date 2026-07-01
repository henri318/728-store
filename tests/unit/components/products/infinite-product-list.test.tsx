import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/es',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'unauthenticated', data: null }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  useGuestCart: () => ({
    items: [],
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    hydrated: true,
  }),
}));

import { InfiniteProductList } from '@/components/products/infinite-product-list';
import type { ClientProductCard } from '@/components/products/infinite-product-list';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Capture the IntersectionObserver callback so tests can fire it.
let intersectionCallbacks: Array<
  (entries: Array<{ isIntersecting: boolean }>) => void
> = [];

class MockIntersectionObserver {
  private cb: (entries: Array<{ isIntersecting: boolean }>) => void;
  constructor(
    cb: (entries: Array<{ isIntersecting: boolean }>) => void,
    _options?: unknown,
  ) {
    this.cb = cb;
    intersectionCallbacks.push(cb);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): unknown[] {
    return [];
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  intersectionCallbacks = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeProduct(id: string, name: string): ClientProductCard {
  return {
    id,
    basePrice: { amount: 10, currency: 'EUR', formattedPrice: '10,00 €' },
    sellerId: 'seller-1',
    sellerName: 'Test Shop',
    translations: [{ locale: 'es', name, description: 'desc' }],
    images: [],
    tags: [],
  };
}

const baseLabels = {
  viewDetails: 'Ver Detalles',
  addToCart: 'Añadir',
  removeFromCart: 'Quitar',
  loadingMore: 'Cargando...',
  noSearchResults: 'Sin resultados para {term}',
  noProducts: 'Sin productos',
  itemsLoadedOne: '{count} producto cargado',
  itemsLoadedMany: '{count} productos cargados',
};

function triggerIntersection(): void {
  act(() => {
    for (const cb of intersectionCallbacks) {
      cb([{ isIntersecting: true }]);
    }
  });
}

describe('InfiniteProductList', () => {
  it('renders the SSR initial items', () => {
    const items = [makeProduct('p1', 'Mug'), makeProduct('p2', 'Lamp')];
    render(
      <InfiniteProductList
        initialItems={items}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText('Lamp')).toBeInTheDocument();
  });

  it('renders the no-search-results message when q is set but initialItems is empty', () => {
    render(
      <InfiniteProductList
        initialItems={[]}
        pageSize={10}
        q="ceramic"
        locale="es"
        labels={baseLabels}
      />,
    );

    expect(screen.getByText('Sin resultados para ceramic')).toBeInTheDocument();
  });

  it('renders the no-products message when no q and initialItems is empty', () => {
    render(
      <InfiniteProductList
        initialItems={[]}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    expect(screen.getByText('Sin productos')).toBeInTheDocument();
  });

  it('resets to the new initial items when q changes', () => {
    const first = [makeProduct('p1', 'Mug')];
    const second = [makeProduct('p2', 'Lamp')];

    const { rerender } = render(
      <InfiniteProductList
        key="all-products"
        initialItems={first}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );
    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.queryByText('Lamp')).not.toBeInTheDocument();

    rerender(
      <InfiniteProductList
        key="lamp"
        initialItems={second}
        pageSize={10}
        q="lamp"
        locale="es"
        labels={baseLabels}
      />,
    );
    expect(screen.getByText('Lamp')).toBeInTheDocument();
    expect(screen.queryByText('Mug')).not.toBeInTheDocument();
  });

  it('fetches the next page when the sentinel becomes visible', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [makeProduct('p11', 'Mug 11')],
        total: 11,
        totalPages: 2,
      }),
    });

    const initial = Array.from({ length: 10 }, (_, i) =>
      makeProduct(`p${i}`, `Item ${i}`),
    );
    render(
      <InfiniteProductList
        initialItems={initial}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    triggerIntersection();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const call = mockFetch.mock.calls[0][0] as string;
    expect(call).toContain('audience=public');
    expect(call).toContain('page=2');
    expect(call).toContain('pageSize=10');
  });

  it('includes q in the fetch URL when set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, totalPages: 0 }),
    });

    const initial = Array.from({ length: 10 }, (_, i) =>
      makeProduct(`p${i}`, `Item ${i}`),
    );
    render(
      <InfiniteProductList
        initialItems={initial}
        pageSize={10}
        q="ceramic"
        locale="es"
        labels={baseLabels}
      />,
    );

    triggerIntersection();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=ceramic'),
      );
    });
  });

  it('shows an error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const initial = Array.from({ length: 10 }, (_, i) =>
      makeProduct(`p${i}`, `Item ${i}`),
    );
    render(
      <InfiniteProductList
        initialItems={initial}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    triggerIntersection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load/);
    });
  });

  it('renders an aria-live polite region for screen-reader announcements', () => {
    render(
      <InfiniteProductList
        initialItems={[makeProduct('p1', 'Mug')]}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );
    const allStatus = screen.getAllByRole('status');
    const live = allStatus.find(
      (n) => n.getAttribute('aria-live') === 'polite',
    );
    expect(live).toBeDefined();
  });

  it('announces loaded count using the localized i18n label (singular)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [makeProduct('p11', 'Mug 11')],
        total: 11,
        totalPages: 2,
      }),
    });

    const initial = Array.from({ length: 10 }, (_, i) =>
      makeProduct(`p${i}`, `Item ${i}`),
    );
    render(
      <InfiniteProductList
        initialItems={initial}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    triggerIntersection();

    await waitFor(() => {
      const allStatus = screen.getAllByRole('status');
      const live = allStatus.find(
        (n) => n.getAttribute('aria-live') === 'polite',
      );
      expect(live).toHaveTextContent('1 producto cargado');
    });
  });

  it('announces loaded count using the localized i18n label (plural)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          makeProduct('p11', 'Mug 11'),
          makeProduct('p12', 'Mug 12'),
          makeProduct('p13', 'Mug 13'),
        ],
        total: 13,
        totalPages: 2,
      }),
    });

    const initial = Array.from({ length: 10 }, (_, i) =>
      makeProduct(`p${i}`, `Item ${i}`),
    );
    render(
      <InfiniteProductList
        initialItems={initial}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );

    triggerIntersection();

    await waitFor(() => {
      const allStatus = screen.getAllByRole('status');
      const live = allStatus.find(
        (n) => n.getAttribute('aria-live') === 'polite',
      );
      expect(live).toHaveTextContent('3 productos cargados');
    });
  });

  it('renders the product link with the locale-prefixed path', () => {
    render(
      <InfiniteProductList
        initialItems={[makeProduct('abc', 'Mug')]}
        pageSize={10}
        q=""
        locale="es"
        labels={baseLabels}
      />,
    );
    const link = screen.getByRole('link', { name: 'Ver Detalles' });
    expect(link).toHaveAttribute('href', '/es/products/abc');
  });
});
