'use client';

import { useEffect } from 'react';
import { AddressAutocompleteSelect } from './address-autocomplete-select';
import { AddressDeliveryFields } from './address-delivery-fields';
import type { UserAddressInput } from '../../domain/user-address';

export type VisibleAddressField =
  | 'street'
  | 'houseNumber'
  | 'postalCode'
  | 'city'
  | 'floor'
  | 'door'
  | 'instructions';
export type AddressField = keyof UserAddressInput;
export type AddressValue = Partial<Record<AddressField, string | null>>;

export interface AddressLabels {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  floor: string;
  door: string;
  instructions: string;
  countryLabel: string;
  searchPlaceholder: string;
  noResults: string;
  retry: string;
  providerError: string;
  listboxLabel: string;
  composedLabel: string;
}

interface AddressAutocompleteFieldsProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: Partial<Record<VisibleAddressField, string | null>>;
  labels: AddressLabels;
  locale: 'es' | 'cat';
  fixedCountry?: { country: string; countryCode: 'ES' };
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

export function AddressAutocompleteFields({
  value,
  onChange,
  errors,
  labels,
  fixedCountry,
}: AddressAutocompleteFieldsProps) {
  const country = fixedCountry?.country ?? labels.countryLabel;
  const normalizedValue = { ...value, country, countryCode: 'ES' as const };
  useEffect(() => {
    if (value.country !== country || value.countryCode !== 'ES')
      onChange(normalizedValue);
  }, [country, onChange, value, value.country, value.countryCode]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <p
        style={{
          color: 'var(--color-green-dark)',
          fontWeight: 600,
          fontSize: '0.9rem',
          margin: '0',
        }}
      >
        {country}
      </p>
      <AddressAutocompleteSelect
        value={normalizedValue}
        onChange={(next) => onChange({ ...next, country, countryCode: 'ES' })}
        error={errors?.street}
        labels={labels}
      />
      <AddressDeliveryFields
        value={normalizedValue}
        onChange={(next) => onChange({ ...next, country, countryCode: 'ES' })}
        errors={errors}
        labels={labels}
        fixedCountry={{ country, countryCode: 'ES' }}
      />
    </div>
  );
}
