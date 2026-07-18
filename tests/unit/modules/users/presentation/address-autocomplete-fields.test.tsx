import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  AddressAutocompleteFields,
  type AddressValue,
  type AddressLabels,
} from '@/modules/users/presentation/components/address-autocomplete-fields';

const labels: AddressLabels = {
  street: 'Street',
  houseNumber: 'House number',
  postalCode: 'Postal code',
  city: 'City',
  floor: 'Floor',
  door: 'Door',
  instructions: 'Instructions',
  countryLabel: 'Spain',
  searchPlaceholder: 'Search address',
  noResults: 'No results',
  retry: 'Retry',
  providerError: 'Suggestions unavailable',
  listboxLabel: 'Address suggestions',
  composedLabel: '{street} {houseNumber}, {postalCode} {city}',
};

function RetryWrapper() {
  const [value, setValue] = useState<AddressValue>({});
  return (
    <AddressAutocompleteFields
      value={value}
      onChange={setValue}
      labels={labels}
      locale="es"
    />
  );
}

describe('AddressAutocompleteFields', () => {
  it('exposes all approved fields and supports keyboard selection', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        suggestions: [
          {
            street: 'Calle Mayor',
            houseNumber: '1',
            city: 'Madrid',
            countryCode: 'ES',
            formattedAddress: 'Calle Mayor 1',
          },
        ],
      }),
    );
    const onChange = vi.fn();
    render(
      <AddressAutocompleteFields
        value={{}}
        onChange={onChange}
        labels={labels}
        locale="es"
      />,
    );
    expect(screen.getByLabelText('House number')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions')).toBeInTheDocument();
    const street = screen.getByLabelText('Street');
    expect(street).toHaveAttribute('role', 'combobox');
    fireEvent.change(street, { target: { value: 'Mayor' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(street, { key: 'ArrowDown' });
    fireEvent.keyDown(street, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'ES', country: 'Spain' }),
    );
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders only the seven editable fields and keeps provider fields hidden', () => {
    render(
      <AddressAutocompleteFields
        value={{}}
        onChange={vi.fn()}
        labels={labels}
        locale="es"
      />,
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByLabelText('Country code')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Formatted address'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Spain')).toBeInTheDocument();
  });

  it('keeps manual fields editable when suggestions fail and retries', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(Response.json({ suggestions: [] }));
    render(<RetryWrapper />);
    fireEvent.change(screen.getByLabelText('Street'), {
      target: { value: 'Madrid' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Suggestions unavailable',
    );
    fireEvent.change(screen.getByLabelText('House number'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a normalized country without mutating parent state', () => {
    const onChange = vi.fn();
    render(
      <AddressAutocompleteFields
        value={{
          street: 'Carrer Major',
          country: 'España',
          countryCode: 'FR',
          city: 'Barcelona',
        }}
        onChange={onChange}
        labels={labels}
        locale="es"
      />,
    );
    expect(screen.getByText('Spain')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
