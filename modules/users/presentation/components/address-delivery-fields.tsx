'use client';

import { TextField } from '@/shared/ui/text-field';
import type {
  AddressValue,
  VisibleAddressField,
} from './address-autocomplete-fields';

export interface AddressDeliveryLabels {
  houseNumber: string;
  postalCode: string;
  city: string;
  floor: string;
  door: string;
  instructions: string;
  countryLabel: string;
}

interface AddressDeliveryFieldsProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: Partial<Record<VisibleAddressField, string | null>>;
  labels: AddressDeliveryLabels;
  fixedCountry?: { country: string; countryCode: 'ES' };
}

const editableFields: Array<
  [Exclude<VisibleAddressField, 'street'>, keyof AddressDeliveryLabels]
> = [
  ['houseNumber', 'houseNumber'],
  ['floor', 'floor'],
  ['door', 'door'],
  ['postalCode', 'postalCode'],
  ['city', 'city'],
  ['instructions', 'instructions'],
];

export function AddressDeliveryFields({
  value,
  onChange,
  errors,
  labels,
  fixedCountry,
}: AddressDeliveryFieldsProps) {
  const country = fixedCountry?.country ?? labels.countryLabel;
  const countryCode = fixedCountry?.countryCode ?? 'ES';
  const update = (field: VisibleAddressField, next: string) =>
    onChange({ ...value, [field]: next, country, countryCode });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {editableFields.map(([field, labelKey]) => (
        <TextField
          key={field}
          label={labels[labelKey]}
          value={value[field] ?? ''}
          error={errors?.[field] ?? undefined}
          onChange={(next) => update(field, next)}
        />
      ))}
      <input type="hidden" name="country" value={country} readOnly />
      <input type="hidden" name="countryCode" value={countryCode} readOnly />
      <input
        type="hidden"
        name="formattedAddress"
        value={value.formattedAddress ?? ''}
        readOnly
      />
    </div>
  );
}
