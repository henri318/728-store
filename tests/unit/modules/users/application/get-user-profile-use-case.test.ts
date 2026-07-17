import { describe, expect, it, vi } from 'vitest';
import { GetUserProfileUseCase } from '@/modules/users/application/use-cases/get-user-profile-use-case';

describe('GetUserProfileUseCase', () => {
  it('loads a profile through its port', async () => {
    const profile = { firstName: 'John' } as never;
    const port = { findById: vi.fn().mockResolvedValue(profile) };

    const result = await new GetUserProfileUseCase(port).execute('user-1');

    expect(port.findById).toHaveBeenCalledWith('user-1');
    expect(result).toBe(profile);
  });
});
