import type {
  FindRecentInput,
  RecordSearchInput,
  SearchHistoryEntry,
  SearchHistoryRepository,
} from '@/modules/search-history/domain/search-history-repository';

/**
 * In-memory SearchHistoryRepository test double.
 *
 * Mirrors the production `@@unique([userId, term, locale])` constraint by
 * upserting on (userId, term, locale) and bumping `searchedAt`. `findRecent`
 * returns distinct terms ordered by `searchedAt DESC`, capped at `limit`.
 */
export class MemorySearchHistoryRepository implements SearchHistoryRepository {
  private rows: SearchHistoryEntry[] = [];

  async record(input: RecordSearchInput): Promise<void> {
    const idx = this.rows.findIndex(
      (r) =>
        r.userId === input.userId &&
        r.term === input.term &&
        r.locale === input.locale,
    );
    if (idx === -1) {
      this.rows.push({
        id: `mem-${this.rows.length + 1}`,
        userId: input.userId,
        term: input.term,
        locale: input.locale,
        searchedAt: input.searchedAt,
      });
    } else {
      this.rows[idx] = {
        ...this.rows[idx],
        searchedAt: input.searchedAt,
      };
    }
  }

  async findRecent(input: FindRecentInput): Promise<SearchHistoryEntry[]> {
    // Filter to user/locale.
    const filtered = this.rows.filter(
      (r) => r.userId === input.userId && r.locale === input.locale,
    );

    // Dedup on term: keep only the most recent searchedAt per term.
    const byTerm = new Map<string, SearchHistoryEntry>();
    for (const row of filtered) {
      const existing = byTerm.get(row.term);
      if (!existing || row.searchedAt > existing.searchedAt) {
        byTerm.set(row.term, row);
      }
    }

    return Array.from(byTerm.values())
      .sort((a, b) => b.searchedAt.getTime() - a.searchedAt.getTime())
      .slice(0, input.limit);
  }

  // Test helpers
  seed(entries: SearchHistoryEntry[]): void {
    this.rows = [...entries];
  }

  all(): SearchHistoryEntry[] {
    return [...this.rows];
  }
}
