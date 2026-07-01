import { prisma } from '@/shared/infrastructure/prisma';
import { Prisma } from '@prisma/client';
import type {
  FindRecentInput,
  RecordSearchInput,
  SearchHistoryEntry,
  SearchHistoryRepository,
} from '../domain/search-history-repository';

/**
 * Prisma adapter for `SearchHistoryRepository`.
 *
 * Mirrors the `(userId, term, locale)` unique constraint from
 * `prisma/schema.prisma` via `upsert` so the dedup semantic is atomic
 * and survives concurrent retried deliveries of the same event.
 */
export class PrismaSearchHistoryRepository implements SearchHistoryRepository {
  async record(input: RecordSearchInput): Promise<void> {
    await prisma.searchHistory.upsert({
      where: {
        userId_term_locale: {
          userId: input.userId,
          term: input.term,
          locale: input.locale,
        },
      },
      create: {
        userId: input.userId,
        term: input.term,
        locale: input.locale,
        searchedAt: input.searchedAt,
      },
      update: {
        searchedAt: input.searchedAt,
      },
    });
  }

  async findRecent(input: FindRecentInput): Promise<SearchHistoryEntry[]> {
    // The schema declares `@@index([userId, locale, searchedAt(sort: Desc)])`
    // so this query is index-backed even at scale.
    //
    // Subquery: DISTINCT ON ("term") deduplicates terms in SQL (keeping the
    // most recent searchedAt per term). The outer query re-sorts by
    // searchedAt DESC so the caller gets the most recent N unique terms
    // without a magic multiplier or a JS re-sort.
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        term: string;
        locale: string;
        searchedAt: Date;
      }>
    >(Prisma.sql`
      SELECT "id", "userId", "term", "locale", "searchedAt"
      FROM (
        SELECT DISTINCT ON ("term") "id", "userId", "term", "locale", "searchedAt"
        FROM "SearchHistory"
        WHERE "userId" = ${input.userId}
          AND "locale" = ${input.locale}
        ORDER BY "term", "searchedAt" DESC
      ) sub
      ORDER BY "searchedAt" DESC
      LIMIT ${input.limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      term: row.term,
      locale: row.locale,
      searchedAt: row.searchedAt,
    }));
  }
}
