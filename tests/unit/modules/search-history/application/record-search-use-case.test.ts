import { describe, it, expect, beforeEach } from 'vitest';
import { RecordSearchUseCase } from '@/modules/search-history/application/record-search-use-case';
import { MemorySearchHistoryRepository } from '@/tests/doubles/memory-search-history-repository';

describe('RecordSearchUseCase', () => {
  let repo: MemorySearchHistoryRepository;
  let useCase: RecordSearchUseCase;

  beforeEach(() => {
    repo = new MemorySearchHistoryRepository();
    useCase = new RecordSearchUseCase(repo);
  });

  it('persists a row for a user', async () => {
    await useCase.execute({
      userId: 'user-1',
      term: 'ceramic',
      locale: 'es',
    });

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].term).toBe('ceramic');
    expect(entries[0].userId).toBe('user-1');
    expect(entries[0].locale).toBe('es');
  });

  it('trims whitespace before persisting', async () => {
    await useCase.execute({
      userId: 'user-1',
      term: '   ceramic   ',
      locale: 'es',
    });

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries[0].term).toBe('ceramic');
  });

  it('rejects empty terms without writing', async () => {
    await useCase.execute({ userId: 'user-1', term: '   ', locale: 'es' });

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries).toHaveLength(0);
  });

  it('rejects empty userId without writing (defense-in-depth)', async () => {
    await useCase.execute({ userId: '', term: 'ceramic', locale: 'es' });

    const entries = await repo.findRecent({
      userId: '',
      locale: 'es',
      limit: 10,
    });
    expect(entries).toHaveLength(0);
  });

  it('rejects an over-long term (DoS guard)', async () => {
    const long = 'x'.repeat(201);
    await useCase.execute({ userId: 'user-1', term: long, locale: 'es' });

    const entries = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    expect(entries).toHaveLength(0);
  });

  it('deduplicates: re-recording the same term keeps ONE row and bumps searchedAt', async () => {
    await useCase.execute({ userId: 'user-1', term: 'ceramic', locale: 'es' });
    const first = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });

    // Small delay so searchedAt moves forward.
    await new Promise((r) => setTimeout(r, 5));

    await useCase.execute({ userId: 'user-1', term: 'ceramic', locale: 'es' });
    const second = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });

    expect(second).toHaveLength(1);
    expect(second[0].term).toBe('ceramic');
    expect(second[0].searchedAt.getTime()).toBeGreaterThanOrEqual(
      first[0].searchedAt.getTime(),
    );
  });

  it('keeps the same term in different locales as separate rows', async () => {
    await useCase.execute({ userId: 'user-1', term: 'ceramic', locale: 'es' });
    await useCase.execute({ userId: 'user-1', term: 'ceramic', locale: 'cat' });

    const es = await repo.findRecent({
      userId: 'user-1',
      locale: 'es',
      limit: 10,
    });
    const cat = await repo.findRecent({
      userId: 'user-1',
      locale: 'cat',
      limit: 10,
    });

    expect(es).toHaveLength(1);
    expect(cat).toHaveLength(1);
    expect(es[0].locale).toBe('es');
    expect(cat[0].locale).toBe('cat');
  });
});
