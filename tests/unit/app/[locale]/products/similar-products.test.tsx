import { act, render, waitFor } from '@testing-library/react';
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
