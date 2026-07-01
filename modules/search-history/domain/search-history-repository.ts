/**
 * SearchHistoryRepository — port for persisting and querying recent
 * search terms on behalf of authenticated users.
 *
 * Production implementation: PrismaSearchHistoryRepository
 * Test implementation:      MemorySearchHistoryRepository
 *
 * The unique constraint `(userId, term, locale)` lives in the schema
 * (see `prisma/schema.prisma`) so dedup is atomic. Implementations
 * are expected to use an UPSERT or a `create` + catch on conflict —
 * the contract here is just "after record(), the row exists with
 * `searchedAt` updated to NOW".
 */
import type { SearchHistoryEntry } from './entities/search-history-entry';

export type { SearchHistoryEntry };

export interface RecordSearchInput {
  readonly userId: string;
  readonly term: string;
  readonly locale: string;
  readonly searchedAt: Date;
}

export interface FindRecentInput {
  readonly userId: string;
  readonly locale: string;
  readonly limit: number;
}

export interface SearchHistoryRepository {
  /**
   * Record (or upsert) a search. The contract guarantees that
   * subsequent `findRecent()` calls for the same `(userId, term, locale)`
   * return ONE entry whose `searchedAt` reflects the most recent call.
   */
  record(input: RecordSearchInput): Promise<void>;

  /**
   * Return up to `limit` most-recent distinct terms for the given user
   * and locale, ordered by `searchedAt DESC`. The repository is
   * responsible for applying the dedup-on-`term` semantic so the
   * use case stays storage-agnostic.
   */
  findRecent(input: FindRecentInput): Promise<SearchHistoryEntry[]>;
}
