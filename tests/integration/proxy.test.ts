import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth/jwt — getToken
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Mock the dynamic container import used for soft-delete check
const mockFindById = vi.fn();
vi.mock('@/composition-root/container', () => ({
  container: {
    getUserRepository: () => ({
      findById: mockFindById,
    }),
  },
}));

import { getToken } from 'next-auth/jwt';

// Import the proxy function — this will trigger any side effects
// and use our mocked getToken
import { proxy } from '@/proxy';

function buildRequest(pathname: string, cookie?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (cookie) {
    headers.set('cookie', cookie);
  }
  return new NextRequest(url, { headers });
}

describe('proxy — auth gate', () => {
  const originalEnv = process.env.NEXTAUTH_SECRET;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalEnv;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user exists and is not deleted
    mockFindById.mockResolvedValue({ id: 'user-123', deletedAt: null });
  });

  // ── Test 1: Unauthenticated request to /es/profile redirects to /es ──
  it('redirects unauthenticated page request to home (/es)', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const req = buildRequest('/es/profile');
    const res = await proxy(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(307);
    const location = res!.headers.get('location');
    expect(location).toBe('http://localhost:3000/es');
  });

  // ── Test 2: Authenticated request (getToken returns a token) passes through ──
  it('allows authenticated page request through', async () => {
    vi.mocked(getToken).mockResolvedValue({
      name: 'Test User',
      email: 'test@example.com',
      sub: 'user-123',
    });

    const req = buildRequest('/es/profile');
    const res = await proxy(req);

    // proxy returns NextResponse.next() for allowed requests
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(200);
  });

  // ── Test 3: API unauthenticated request returns 401 JSON ──
  it('returns 401 JSON for unauthenticated API request', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const req = buildRequest('/api/users/me');
    const res = await proxy(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  // ── Test 4: /es/auth/change-password is protected — redirects when unauthenticated ──
  it('protects /auth/change-password (unauthenticated → redirect)', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const req = buildRequest('/es/auth/change-password');
    const res = await proxy(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(307);
    const location = res!.headers.get('location');
    expect(location).toBe('http://localhost:3000/es');
  });

  // ── Triangulation: Authenticated API call passes through ──
  it('allows authenticated API request through', async () => {
    vi.mocked(getToken).mockResolvedValue({
      name: 'Admin',
      email: 'admin@example.com',
      sub: 'user-456',
    });

    const req = buildRequest('/api/users/me');
    const res = await proxy(req);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(200);
  });
});
