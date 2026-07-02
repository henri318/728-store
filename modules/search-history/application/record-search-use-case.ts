import type { SearchHistoryRepository } from '../domain/search-history-repository';

const MAX_TERM_LENGTH = 200;

export interface RecordSearchInput {
  readonly userId: string;
  readonly term: string;
  readonly locale: string;
}

/**
 * RecordSearchUseCase — persist a search term for the given user.
 *
 * Guards:
 *  - Rejects empty / whitespace-only terms.
 *  - Rejects empty userIds (defense-in-depth; the subscriber is the
 *    canonical gate, but a faulty caller must not poison the table).
 *  - Rejects terms longer than 200 chars (DoS guard for absurd inputs).
 *
 * Dedup is delegated to the repository (atomic via the
 * `(userId, term, locale)` unique constraint in production, in-memory
 * upsert in tests).
 */
export class RecordSearchUseCase {
  constructor(private readonly repository: SearchHistoryRepository) {}

  async execute(input: RecordSearchInput): Promise<void> {
    const term = input.term.trim();
    if (term.length === 0) return;
    if (input.userId.length === 0) return;
    if (term.length > MAX_TERM_LENGTH) return;

    await this.repository.record({
      userId: input.userId,
      term,
      locale: input.locale,
      searchedAt: new Date(),
    });
  }
}
