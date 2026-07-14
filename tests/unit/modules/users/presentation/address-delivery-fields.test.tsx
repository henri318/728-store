import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddressDeliveryFields } from '@/modules/users/presentation/components/address-delivery-fields';

const labels = {
  houseNumber: 'House number',
  postalCode: 'Postal code',
  city: 'City',
  floor: 'Floor',
  door: 'Door',
  instructions: 'Instructions',
  countryLabel: 'Spain',
};

describe('AddressDeliveryFields', () => {
  it('renders editable delivery fields and hidden country inputs', () => {
    render(
      <AddressDeliveryFields value={{}} onChange={vi.fn()} labels={labels} />,
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.queryByLabelText('Country code')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Formatted address'),
    ).not.toBeInTheDocument();
  });

  it('derives Spain and ES in hidden inputs while preserving formatted provider data', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AddressDeliveryFields
        value={{ formattedAddress: 'hidden provider value' }}
        onChange={onChange}
        labels={labels}
      />,
    );
    expect(
      container.querySelector('input[type="hidden"][name="countryCode"]'),
    ).toHaveValue('ES');
    expect(
      container.querySelector('input[type="hidden"][name="formattedAddress"]'),
    ).toHaveValue('hidden provider value');
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Barcelona' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Barcelona', countryCode: 'ES' }),
    );
  });
});
