/**
 * SearchHistoryEntry — pure data shape returned by the
 * SearchHistoryRepository. Mirrors the persisted `SearchHistory` table
 * but lives in the domain layer so the use case can stay storage-agnostic.
 */
export interface SearchHistoryEntry {
  readonly id: string;
  readonly userId: string;
  readonly term: string;
  readonly locale: string;
  readonly searchedAt: Date;
}

/**
 * Maximum number of recent searches returned to the frontend.
 * The spec caps suggestions at 5 (cross-device, server-backed).
 */
export const RECENT_SEARCHES_LIMIT = 5;
