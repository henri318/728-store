'use client';

import { useEffect, useRef, useState } from 'react';
import { AddressAutocompleteController } from '../address-autocomplete-controller';
import type { UserAddressInput } from '../../domain/user-address';
import type {
  AddressValue,
  AddressLabels,
} from './address-autocomplete-fields';

interface AddressAutocompleteSelectProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  error?: string | null;
  labels: Pick<
    AddressLabels,
    | 'street'
    | 'searchPlaceholder'
    | 'retry'
    | 'providerError'
    | 'listboxLabel'
    | 'composedLabel'
  >;
}

function composeLabel(suggestion: UserAddressInput, template: string) {
  const values = {
    '{street}': suggestion.street ?? '',
    '{houseNumber}': suggestion.houseNumber ?? '',
    '{postalCode}': suggestion.postalCode ?? '',
    '{city}': suggestion.city ?? '',
  };
  let composed = template;
  for (const [token, value] of Object.entries(values))
    composed = composed.split(token).join(value);
  return composed.replaceAll(' ,', ',').replaceAll('  ', ' ').trim();
}

export function AddressAutocompleteSelect({
  value,
  onChange,
  error,
  labels,
}: AddressAutocompleteSelectProps) {
  const [suggestions, setSuggestions] = useState<UserAddressInput[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [providerError, setProviderError] = useState(false);
  const controllerRef = useRef(
    new AddressAutocompleteController({
      search: async (query, signal) => {
        const response = await fetch(
          `/api/addresses/autocomplete?q=${encodeURIComponent(query)}`,
          { signal },
        );
        if (!response.ok) throw new Error('suggestions');
        const payload = (await response.json()) as {
          suggestions: UserAddressInput[];
        };
        return payload.suggestions;
      },
    }),
  );
  const listboxId = 'address-suggestions';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => controllerRef.current.dispose(), []);

  const search = (query: string, isRetry = false) => {
    onChange({ ...value, street: query });
    setProviderError(false);
    const run = isRetry
      ? controllerRef.current.retry.bind(controllerRef.current)
      : controllerRef.current.search.bind(controllerRef.current);
    run(
      query,
      (result) => {
        setSuggestions(result);
        setActiveIndex(result.length > 0 ? 0 : -1);
      },
      () => {
        setSuggestions([]);
        setActiveIndex(-1);
        setProviderError(true);
      },
    );
  };

  const select = (suggestion: UserAddressInput) => {
    onChange({ ...value, ...suggestion });
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const highlightedIndex = hoverIndex >= 0 ? hoverIndex : activeIndex;

  return (
    <div
      style={{ position: 'relative' }}
      onKeyDown={(event) => {
        if (suggestions.length === 0) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActiveIndex((i) => (i + 1) % suggestions.length);
          setHoverIndex(-1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveIndex(
            (i) => (i - 1 + suggestions.length) % suggestions.length,
          );
          setHoverIndex(-1);
        } else if (event.key === 'Enter' && highlightedIndex >= 0) {
          event.preventDefault();
          select(suggestions[highlightedIndex]);
        } else if (event.key === 'Escape') {
          setSuggestions([]);
          setActiveIndex(-1);
          setHoverIndex(-1);
        }
      }}
    >
      <label
        htmlFor="address-input"
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1b5e4a',
          marginBottom: '6px',
        }}
      >
        {labels.street}
      </label>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          id="address-input"
          placeholder={labels.searchPlaceholder}
          aria-controls={listboxId}
          aria-expanded={suggestions.length > 0}
          aria-haspopup="listbox"
          role="combobox"
          type="text"
          value={value.street ?? ''}
          onChange={(e) => search(e.target.value)}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `address-suggestion-${highlightedIndex}`
              : undefined
          }
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 16px',
            border: error ? '1px solid #d9534f' : '1px solid #e0e0e0',
            borderRadius: '24px',
            fontSize: '15px',
            color: '#333',
            outline: 'none',
          }}
        />
      </div>

      {suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={labels.listboxLabel}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: '6px 0',
            listStyle: 'none',
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          {suggestions.map((suggestion, index) => {
            const suggestionKey =
              suggestion.formattedAddress ??
              [suggestion.street, suggestion.houseNumber, suggestion.postalCode]
                .filter(Boolean)
                .join('-');
            return (
              <li
                id={`address-suggestion-${index}`}
                key={suggestionKey}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(-1)}
                onMouseDown={() => select(suggestion)}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: '#222',
                  background:
                    index === highlightedIndex ? '#f0f4f2' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {composeLabel(suggestion, labels.composedLabel)}
              </li>
            );
          })}
        </ul>
      )}

      {providerError && (
        <div style={{ marginTop: '8px' }} role="alert">
          <span style={{ fontSize: '14px', color: '#df8072' }}>
            {labels.providerError}
          </span>
          <button
            type="button"
            onClick={() => search(value.street ?? '', true)}
            style={{
              marginLeft: '8px',
              padding: '4px 12px',
              border: '1px solid #df8072',
              borderRadius: '999px',
              background: 'none',
              color: '#df8072',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {labels.retry}
          </button>
        </div>
      )}
    </div>
  );
}
