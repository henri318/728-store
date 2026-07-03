import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search-history/recent/route';
import { MemorySearchHistoryRepository } from '@/tests/doubles/memory-search-history-repository';
import type { SearchHistoryRepository } from '@/modules/search-history/domain/search-history-repository';

const mocks = vi.hoisted(() => {
  return {
    getSearchHistoryRepositoryMock: vi.fn(),
    getSessionMock: vi.fn(),
  };
});

vi.mock('@/composition-root/container', () => ({
  container: {
    getSearchHistoryRepository: mocks.getSearchHistoryRepositoryMock,
    getSession: () => ({
      getSession: mocks.getSessionMock,
    }),
  },
}));

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/search-history/recent', () => {
  let repo: SearchHistoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MemorySearchHistoryRepository();
    mocks.getSearchHistoryRepositoryMock.mockReturnValue(repo);
  });

  it('returns 401 when there is no session (guest)', async () => {
    mocks.getSessionMock.mockResolvedValue(null);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/search-history/recent'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required');
  });

  it('returns up to 5 recent terms for an authenticated user', async () => {
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    const base = Date.now();
    for (let i = 0; i < 8; i++) {
      await repo.record({
        userId: 'user-1',
        term: `term-${i}`,
        locale: 'es',
        searchedAt: new Date(base + i * 1000),
      });
    }

    const res = await GET(
      makeGetRequest(
        'http://localhost:3000/api/search-history/recent?locale=es',
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(5);
    expect(body.items.map((i: { term: string }) => i.term)).toEqual([
      'term-7',
      'term-6',
      'term-5',
      'term-4',
      'term-3',
    ]);
  });

  it('returns an empty list for an authenticated user with no history', async () => {
    mocks.getSessionMock.mockResolvedValue({ id: 'ghost' });

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/search-history/recent'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it('isolates by locale', async () => {
    mocks.getSessionMock.mockResolvedValue({ id: 'user-1' });
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(1),
    });
    await repo.record({
      userId: 'user-1',
      term: 'cadira',
      locale: 'cat',
      searchedAt: new Date(2),
    });

    const resEs = await GET(
      makeGetRequest(
        'http://localhost:3000/api/search-history/recent?locale=es',
      ),
    );
    const bodyEs = await resEs.json();
    expect(bodyEs.items.map((i: { term: string }) => i.term)).toEqual(['lamp']);

    const resCat = await GET(
      makeGetRequest(
        'http://localhost:3000/api/search-history/recent?locale=cat',
      ),
    );
    const bodyCat = await resCat.json();
    expect(bodyCat.items.map((i: { term: string }) => i.term)).toEqual([
      'cadira',
    ]);
  });

  it('does not call the repository for guests (no data leak)', async () => {
    mocks.getSessionMock.mockResolvedValue(null);
    const recordSpy = vi.spyOn(repo, 'findRecent');

    await GET(
      makeGetRequest('http://localhost:3000/api/search-history/recent'),
    );

    expect(recordSpy).not.toHaveBeenCalled();
  });
});
