'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from '@/app/[locale]/page.module.css';

/**
 * Recent suggestion shape passed from the server (RSC) to the client.
 *
 * - `null` → the user is a guest; suggestions section is NEVER rendered.
 * - `[]`   → the user is authenticated but has no recent searches;
 *             a "no recent searches" message is shown.
 * - non-empty → display up to 5 recent terms.
 *
 * The server already enforces the privacy contract: guests receive null
 * and no browser storage is ever written for this feature.
 */
export interface RecentSearchSuggestion {
  term: string;
  searchedAt: string;
}

export interface SearchInputWithSuggestionsLabels {
  placeholder: string;
  ariaLabel: string;
  submitLabel: string;
  recentSearchesLabel: string;
  noRecentSearches: string;
}

export interface SearchInputWithSuggestionsProps {
  initialValue: string;
  /** `null` for guests, `[]` or suggestions for authenticated users. */
  recent: RecentSearchSuggestion[] | null;
  locale: string;
  labels: SearchInputWithSuggestionsLabels;
}

/**
 * SearchInputWithSuggestions — ARIA combobox with debounced URL updates
 * and recent-search suggestions.
 *
 * A11y contract (WCAG 2.2 AA):
 *  - role=combobox on the input with aria-expanded + aria-controls.
 *  - role=listbox of role=option suggestions.
 *  - ArrowUp/ArrowDown navigates; Enter selects; Escape closes.
 *  - Focus is preserved on selection — no jarring page jump.
 *
 * Privacy contract (v1 spec):
 *  - No browser storage is written by this component. The `recent`
 *    prop comes from the server (RSC) for authenticated users.
 *  - Guests receive `recent = null` and the listbox is hidden.
 */
export function SearchInputWithSuggestions({
  initialValue,
  recent,
  labels,
}: SearchInputWithSuggestionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [showInput, setShowInput] = useState(initialValue !== '');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialValueRef = useRef(initialValue);
  const routerRef = useRef(router);
  const searchParamsRef = useRef(searchParams);
  const listboxId = useId();
  const inputId = useId();
  const isAuthenticated = recent !== null;
  const suggestions = useMemo(() => (recent ?? []).slice(0, 5), [recent]);
  const hasSuggestions = suggestions.length > 0;
  const showSuggestionsDropdown = isOpen && isAuthenticated;
  const showEmptySuggestions = showSuggestionsDropdown && !hasSuggestions;

  // When the input appears (icon click), focus it immediately.
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    routerRef.current = router;
    searchParamsRef.current = searchParams;
  }, [router, searchParams]);

  // Debounce URL update — only fires when the user has typed at least
  // 3 characters and stops typing for 500ms.
  useEffect(() => {
    if (value === initialValueRef.current) return;
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(
        searchParamsRef.current?.toString() ?? '',
      );
      if (trimmed.length >= 3) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      const query = params.toString();
      routerRef.current.replace(query ? `?${query}` : '?', { scroll: false });
    }, 500);
    return () => clearTimeout(handle);
  }, [value]);
  const handleSelect = useCallback(
    (term: string) => {
      setValue(term);
      setIsOpen(false);
      setActiveIndex(-1);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('q', term);
      router.replace(`?${params.toString()}`, { scroll: false });
      inputRef.current?.focus();
    },
    [router, searchParams],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowInput(false);
        setIsOpen(false);
        setActiveIndex(-1);
        setValue('');
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.delete('q');
        router.replace(`?${params.toString()}`, { scroll: false });
        return;
      }
      if (!isOpen || !hasSuggestions) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((idx) => (idx < suggestions.length - 1 ? idx + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((idx) => (idx > 0 ? idx - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const choice = suggestions[activeIndex];
        if (choice) handleSelect(choice.term);
      }
    },
    [
      isOpen,
      hasSuggestions,
      suggestions,
      activeIndex,
      handleSelect,
      router,
      searchParams,
    ],
  );

  return (
    <div
      className={styles.searchWrap}
      data-testid="search-input-with-suggestions"
    >
      <form
        role="search"
        className={styles.searchForm}
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams(searchParams?.toString() ?? '');
          if (value.trim().length > 0) {
            params.set('q', value);
          } else {
            params.delete('q');
          }
          router.replace(`?${params.toString()}`, { scroll: false });
          setShowInput(false);
          setIsOpen(false);
        }}
      >
        <div
          className={`${styles.searchInputGroup} ${showInput ? styles.searchInputGroupVisible : ''}`}
        >
          <label htmlFor={inputId} className={styles.srOnly}>
            {labels.ariaLabel}
          </label>
          {showInput && (
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              role="combobox"
              aria-expanded={showSuggestionsDropdown}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
              }
              autoComplete="off"
              spellCheck={false}
              className={styles.searchInput}
              placeholder={labels.placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setIsOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsOpen(false), 120);
              }}
              onKeyDown={handleKeyDown}
              data-testid="search-input"
            />
          )}
          <button
            type={showInput ? 'submit' : 'button'}
            className={styles.searchToggle}
            aria-label={showInput ? labels.submitLabel : labels.ariaLabel}
            onMouseDown={(e) => {
              if (!showInput) {
                e.preventDefault();
                setShowInput(true);
              }
            }}
          >
            <svg aria-hidden="true" className={styles.searchIcon}>
              <use href="/img/icons/sprites.svg#icon-search" />
            </svg>
          </button>
        </div>
      </form>
      {showSuggestionsDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={labels.recentSearchesLabel}
          className={styles.suggestionsList}
        >
          {hasSuggestions ? (
            suggestions.map((s, idx) => (
              <li
                key={s.term}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`${styles.suggestionItem} ${
                  idx === activeIndex ? styles.suggestionItemActive : ''
                }`}
                onMouseDown={(e) => {
                  // mousedown (not click) so it fires before the input's blur.
                  e.preventDefault();
                  handleSelect(s.term);
                }}
              >
                {s.term}
              </li>
            ))
          ) : showEmptySuggestions ? (
            <li
              role="option"
              aria-selected={false}
              className={styles.suggestionEmpty}
            >
              {labels.noRecentSearches}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
