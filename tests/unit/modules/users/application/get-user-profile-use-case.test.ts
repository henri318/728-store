import { describe, expect, it, vi } from 'vitest';
import { GetUserProfileUseCase } from '@/modules/users/application/use-cases/get-user-profile-use-case';

describe('GetUserProfileUseCase', () => {
  it('loads a profile with its complete delivery address through its port', async () => {
    const profile = { firstName: 'John' } as never;
    const address = {
      street: 'Calle Mayor',
      houseNumber: '12',
      city: 'Madrid',
      postalCode: '28013',
      country: 'Espana',
      countryCode: 'ES',
      floor: '3',
      door: 'B',
      instructions: 'Llamar al timbre',
    };
    const port = {
      findById: vi.fn().mockResolvedValue(profile),
      findAddressByUserId: vi.fn().mockResolvedValue(address),
    };

    const result = await new GetUserProfileUseCase(port).execute('user-1');

    expect(port.findById).toHaveBeenCalledWith('user-1');
    expect(port.findAddressByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(
      expect.objectContaining({
        firstName: 'John',
        deliveryAddress: address,
      }),
    );
  });

  it('does not query an address when the user does not exist', async () => {
    const port = {
      findById: vi.fn().mockResolvedValue(null),
      findAddressByUserId: vi.fn(),
    };

    const result = await new GetUserProfileUseCase(port).execute('missing');

    expect(result).toBeNull();
    expect(port.findAddressByUserId).not.toHaveBeenCalled();
  });
});
