import { RECENT_SEARCHES_LIMIT } from '../domain/entities/search-history-entry';
import type { SearchHistoryEntry } from '../domain/entities/search-history-entry';
import type { SearchHistoryRepository } from '../domain/search-history-repository';

export interface GetRecentSearchesInput {
  readonly userId: string;
  readonly locale: string;
  /** Optional override; defaults to RECENT_SEARCHES_LIMIT (5). */
  readonly limit?: number;
}

/**
 * GetRecentSearchesUseCase — return the most-recent distinct search
 * terms for a user.
 *
 * The dedup-on-`term` semantic is enforced by the repository so the
 * use case stays storage-agnostic.
 */
export class GetRecentSearchesUseCase {
  constructor(private readonly repository: SearchHistoryRepository) {}

  async execute(input: GetRecentSearchesInput): Promise<SearchHistoryEntry[]> {
    return this.repository.findRecent({
      userId: input.userId,
      locale: input.locale,
      limit: input.limit ?? RECENT_SEARCHES_LIMIT,
    });
  }
}
