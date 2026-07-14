'use client';

import { useEffect, useRef, useState } from 'react';
import { TextField } from '@/shared/ui/text-field';
import { AddressAutocompleteController } from '../address-autocomplete-controller';
import type { UserAddressInput } from '../../domain/user-address';
import type { AddressValue } from './address-autocomplete-fields';

export interface AddressComboboxLabels {
  street: string;
  searchPlaceholder: string;
  noResults: string;
  retry: string;
  providerError: string;
  listboxLabel: string;
  composedLabel: string;
}

interface AddressAutocompleteComboboxProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  error?: string | null;
  labels: AddressComboboxLabels;
}

export function composeAddressLabel(
  suggestion: UserAddressInput,
  template: string,
) {
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

export function AddressAutocompleteCombobox({
  value,
  onChange,
  error,
  labels,
}: AddressAutocompleteComboboxProps) {
  const [suggestions, setSuggestions] = useState<UserAddressInput[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [providerError, setProviderError] = useState(false);
  const controller = useRef(
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

  useEffect(() => () => controller.current.dispose(), []);

  const search = (query: string, isRetry = false) => {
    onChange({ ...value, street: query });
    setProviderError(false);
    const run = isRetry
      ? controller.current.retry.bind(controller.current)
      : controller.current.search.bind(controller.current);
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
  };

  return (
    <div
      onKeyDown={(event) => {
        if (suggestions.length === 0) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveIndex(
            (index) => (index - 1 + suggestions.length) % suggestions.length,
          );
        } else if (event.key === 'Enter' && activeIndex >= 0) {
          event.preventDefault();
          select(suggestions[activeIndex]);
        } else if (event.key === 'Escape') {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      }}
    >
      <TextField
        label={labels.street}
        placeholder={labels.searchPlaceholder}
        value={value.street ?? ''}
        error={error ?? undefined}
        onChange={search}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={suggestions.length > 0}
        aria-activedescendant={
          activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
        }
        aria-haspopup="listbox"
      />
      {suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" aria-label={labels.listboxLabel}>
          {suggestions.map((suggestion, index) => (
            <li
              id={`address-suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={`${suggestion.street ?? 'address'}-${index}`}
              onMouseDown={() => select(suggestion)}
            >
              {composeAddressLabel(suggestion, labels.composedLabel)}
            </li>
          ))}
        </ul>
      )}
      {providerError && <div role="alert">{labels.providerError}</div>}
      {providerError && (
        <button type="button" onClick={() => search(value.street ?? '', true)}>
          {labels.retry}
        </button>
      )}
    </div>
  );
}
