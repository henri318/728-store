import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const getTokenMock = vi.fn();
  return { getTokenMock };
});

vi.mock('next-auth/jwt', () => ({
  getToken: mocks.getTokenMock,
}));

import { proxy } from '@/proxy';

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/seller/products', 'http://localhost:3000/es'],
    ['/es/seller/products', 'http://localhost:3000/es'],
    ['/cat/seller/products', 'http://localhost:3000/cat'],
  ])('protects seller route %s', async (pathname, expectedLocation) => {
    mocks.getTokenMock.mockResolvedValue(null);

    const response = await proxy(
      new NextRequest(`http://localhost:3000${pathname}`),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(expectedLocation);
    expect(mocks.getTokenMock).toHaveBeenCalled();
  });

  it('does not treat unknown locale prefixes as protected seller routes', async () => {
    mocks.getTokenMock.mockResolvedValue(null);

    const response = await proxy(
      new NextRequest('http://localhost:3000/xx/seller/products'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/es/xx/seller/products',
    );
    expect(mocks.getTokenMock).not.toHaveBeenCalled();
  });

  it('does not treat /seller_admin as a protected seller route', async () => {
    mocks.getTokenMock.mockResolvedValue(null);

    const response = await proxy(
      new NextRequest('http://localhost:3000/seller_admin'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/es/seller_admin',
    );
    expect(mocks.getTokenMock).not.toHaveBeenCalled();
  });
});
