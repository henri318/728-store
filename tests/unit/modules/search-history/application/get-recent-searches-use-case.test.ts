import { describe, it, expect, beforeEach } from 'vitest';
import { GetRecentSearchesUseCase } from '@/modules/search-history/application/get-recent-searches-use-case';
import { MemorySearchHistoryRepository } from '@/tests/doubles/memory-search-history-repository';

describe('GetRecentSearchesUseCase', () => {
  let repo: MemorySearchHistoryRepository;
  let useCase: GetRecentSearchesUseCase;

  beforeEach(() => {
    repo = new MemorySearchHistoryRepository();
    useCase = new GetRecentSearchesUseCase(repo);
  });

  it('returns up to 5 most-recent distinct terms', async () => {
    const base = Date.now();
    for (let i = 0; i < 8; i++) {
      await repo.record({
        userId: 'user-1',
        term: `term-${i}`,
        locale: 'es',
        searchedAt: new Date(base + i * 1000),
      });
    }

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'es',
    });

    expect(result).toHaveLength(5);
    // Most-recent first: term-7, term-6, term-5, term-4, term-3
    expect(result.map((r) => r.term)).toEqual([
      'term-7',
      'term-6',
      'term-5',
      'term-4',
      'term-3',
    ]);
  });

  it('deduplicates so the same term never appears twice', async () => {
    const base = Date.now();
    // Three records of "lamp" at different times, plus two distinct terms.
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(base),
    });
    await repo.record({
      userId: 'user-1',
      term: 'chair',
      locale: 'es',
      searchedAt: new Date(base + 1000),
    });
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(base + 2000),
    });
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(base + 3000),
    });
    await repo.record({
      userId: 'user-1',
      term: 'table',
      locale: 'es',
      searchedAt: new Date(base + 4000),
    });

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'es',
    });

    expect(result.map((r) => r.term)).toEqual(['table', 'lamp', 'chair']);
  });

  it('returns an empty array when the user has no history', async () => {
    const result = await useCase.execute({
      userId: 'ghost',
      locale: 'es',
    });

    expect(result).toEqual([]);
  });

  it('isolates by userId', async () => {
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(),
    });
    await repo.record({
      userId: 'user-2',
      term: 'chair',
      locale: 'es',
      searchedAt: new Date(),
    });

    const r1 = await useCase.execute({ userId: 'user-1', locale: 'es' });
    const r2 = await useCase.execute({ userId: 'user-2', locale: 'es' });

    expect(r1.map((r) => r.term)).toEqual(['lamp']);
    expect(r2.map((r) => r.term)).toEqual(['chair']);
  });

  it('isolates by locale', async () => {
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'es',
      searchedAt: new Date(1),
    });
    await repo.record({
      userId: 'user-1',
      term: 'lamp',
      locale: 'cat',
      searchedAt: new Date(2),
    });

    const es = await useCase.execute({ userId: 'user-1', locale: 'es' });
    const cat = await useCase.execute({ userId: 'user-1', locale: 'cat' });

    expect(es).toHaveLength(1);
    expect(es[0].locale).toBe('es');
    expect(cat).toHaveLength(1);
    expect(cat[0].locale).toBe('cat');
  });
});
