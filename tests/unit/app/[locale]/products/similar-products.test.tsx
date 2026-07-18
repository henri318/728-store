import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimilarProducts } from '@/app/[locale]/products/[id]/similar-products';

const callbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> =
  [];

class MockIntersectionObserver {
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    callbacks.push(callback);
  }
  observe() {}
  disconnect() {}
}

describe('SimilarProducts', () => {
  beforeEach(() => {
    callbacks.length = 0;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => vi.unstubAllGlobals());

  const props = {
    productId: 'product',
    locale: 'es',
    labels: {
      title: 'Similar',
      viewDetails: 'View',
      noImageAvailable: 'No image',
      loading: 'Loading',
    },
  };

  // eslint-disable-next-line unicorn/consistent-function-scoping
  async function intersect() {
    await act(async () => {
      callbacks[0]([{ isIntersecting: true }]);
      await Promise.resolve();
    });
  }

  it('renders successful items and clears loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'item',
              basePrice: { formattedPrice: '10 €' },
              translations: [
                { locale: 'es', name: 'Similar item', description: null },
              ],
              cover: null,
            },
          ],
        }),
      }),
    );
    render(<SimilarProducts {...props} />);
    await intersect();
    await waitFor(() => expect(screen.getByText('Similar item')).toBeTruthy());
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it.each([
    ['empty', { ok: true, json: async () => ({ items: [] }) }],
    ['invalid', { ok: true, json: async () => ({ items: 'invalid' }) }],
    ['failed', { ok: false, json: async () => ({}) }],
  ])('hides itself after a %s response', async (_case, response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    render(<SimilarProducts {...props} />);
    await intersect();
    await waitFor(() => expect(screen.queryByLabelText('Similar')).toBeNull());
  });

  it('hides itself after a rejected request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<SimilarProducts {...props} />);
    await intersect();
    await waitFor(() => expect(screen.queryByLabelText('Similar')).toBeNull());
  });

  it('aborts its request when the product changes', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        signal = options?.signal ?? undefined;
        return new Promise(() => {});
      }),
    );
    const props = {
      locale: 'es',
      labels: {
        title: 'Similar',
        viewDetails: 'View',
        noImageAvailable: 'No image',
        loading: 'Loading',
      },
    };
    const { rerender } = render(
      <SimilarProducts {...props} productId="first" />,
    );

    await act(async () => {
      callbacks[0]([{ isIntersecting: true }]);
      await Promise.resolve();
    });
    await waitFor(() => expect(signal).toBeDefined());
    rerender(<SimilarProducts {...props} productId="second" />);

    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
