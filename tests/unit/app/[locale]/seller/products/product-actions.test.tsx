import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => {
  const fetchMock = vi.fn();
  const useDictionaryMock = vi.fn();
  const refreshMock = vi.fn();

  return { fetchMock, useDictionaryMock, refreshMock };
});

vi.mock('@/shared/i18n/dictionary-context', () => ({
  useDictionary: mocks.useDictionaryMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refreshMock }),
}));

globalThis.fetch = mocks.fetchMock as typeof fetch;

import { ProductActions } from '@/app/[locale]/seller/products/product-actions';

function makeDict() {
  return {
    common: {
      loading: 'Loading...',
    },
    admin: {
      suspendProduct: 'Suspend',
      activateProduct: 'Activate',
      eliminateProduct: 'Eliminate',
    },
  } as unknown as Awaited<
    ReturnType<typeof import('@/shared/i18n/get-dictionary').getDictionary>
  >;
}

describe('ProductActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDictionaryMock.mockReturnValue(makeDict());
  });

  it('shows Suspend for ACTIVE products and archives on click', async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ARCHIVED' }),
    });

    const user = userEvent.setup();
    render(<ProductActions productId="p-1" currentStatus="ACTIVE" />);

    await user.click(screen.getByRole('button', { name: 'Suspend' }));

    expect(mocks.fetchMock).toHaveBeenCalledWith('/api/products/p-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
  });

  it('shows Activate for DRAFT products', () => {
    render(<ProductActions productId="p-1" currentStatus="DRAFT" />);

    expect(
      screen.getByRole('button', { name: 'Activate' }),
    ).toBeInTheDocument();
  });

  it('shows no actions for ELIMINATED products', () => {
    render(<ProductActions productId="p-1" currentStatus="ELIMINATED" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Activate and Eliminate for ARCHIVED products', () => {
    render(<ProductActions productId="p-1" currentStatus="ARCHIVED" />);

    expect(
      screen.getByRole('button', { name: 'Activate' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Eliminate' }),
    ).toBeInTheDocument();
  });

  it('disables the action while loading', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    mocks.fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<ProductActions productId="p-1" currentStatus="ACTIVE" />);

    await user.click(screen.getByRole('button', { name: 'Suspend' }));

    expect(screen.getAllByRole('button', { name: 'Loading...' })).toHaveLength(
      2,
    );

    await act(async () => {
      resolveFetch?.(
        new Response(JSON.stringify({ status: 'ARCHIVED' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
  });
});
