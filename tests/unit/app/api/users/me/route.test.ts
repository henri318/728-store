import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  executeUpdate: vi.fn(),
  saveAddress: vi.fn(),
  clearAddress: vi.fn(),
  findAddressByUserId: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/modules/users/application/use-cases/update-user-use-case', () => ({
  UpdateUserUseCase: class {
    execute = mocks.executeUpdate;
  },
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getUserRepository: () => ({
      saveAddress: mocks.saveAddress,
      clearAddress: mocks.clearAddress,
      findAddressByUserId: mocks.findAddressByUserId,
    }),
    getOutboxRepository: () => ({}),
  },
}));

import { PATCH } from '@/app/api/users/me/route';

function makePatch(body: unknown) {
  return new NextRequest('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.executeUpdate.mockResolvedValue({
      userId: { value: 'user-1' },
      email: { value: 'user@example.com' },
      firstName: 'Test',
      lastName: 'User',
      address: null,
    });
  });

  it('persists and reads back the complete delivery address', async () => {
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
    mocks.findAddressByUserId.mockResolvedValue(address);

    const response = await PATCH(
      makePatch({ firstName: 'Test', lastName: 'User', address }),
    );

    expect(response.status).toBe(200);
    expect(mocks.saveAddress).toHaveBeenCalledWith('user-1', address);
    expect(mocks.findAddressByUserId).toHaveBeenCalledWith('user-1');
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ address }),
    );
  });
});
