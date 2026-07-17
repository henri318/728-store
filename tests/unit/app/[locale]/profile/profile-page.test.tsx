import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const findUserByIdMock = vi.fn();
  const redirectMock = vi.fn();
  const profileFormMock = vi.fn();

  return {
    getSessionMock,
    findUserByIdMock,
    redirectMock,
    profileFormMock,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getSessionMock,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
}));

vi.mock('@/shared/infrastructure/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getUserRepository: () => ({ findById: mocks.findUserByIdMock }),
  },
}));

vi.mock('@/app/[locale]/profile/profile-form', () => ({
  ProfileForm: (props: unknown) => {
    mocks.profileFormMock(props);
    return <div data-testid="profile-form" />;
  },
}));

import ProfilePage from '@/app/[locale]/profile/page';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'CUSTOMER' },
    });
    mocks.findUserByIdMock.mockResolvedValue({
      email: { value: 'test@example.com' },
      firstName: 'John',
      lastName: 'Doe',
      address: {
        street: '123 Main St',
        city: 'Barcelona',
        postalCode: '08001',
        country: 'Spain',
      },
    });
  });

  it('loads the authenticated user from the repository and passes it to the client form', async () => {
    const element = await ProfilePage({
      params: Promise.resolve({ locale: 'es' }),
    });

    render(element as never);

    expect(mocks.findUserByIdMock).toHaveBeenCalledWith('user-1');
    expect(mocks.profileFormMock).toHaveBeenCalledWith({
      locale: 'es',
      profile: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        address: {
          street: '123 Main St',
          city: 'Barcelona',
          postalCode: '08001',
          country: 'Spain',
        },
      },
      role: 'CUSTOMER',
    });
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to sign in', async () => {
    mocks.getSessionMock.mockResolvedValue(null);

    await ProfilePage({ params: Promise.resolve({ locale: 'es' }) });

    expect(mocks.redirectMock).toHaveBeenCalledWith('/es/auth/signin');
    expect(mocks.findUserByIdMock).not.toHaveBeenCalled();
  });

  it('redirects when the authenticated user no longer exists', async () => {
    mocks.findUserByIdMock.mockResolvedValue(null);

    await ProfilePage({ params: Promise.resolve({ locale: 'cat' }) });

    expect(mocks.redirectMock).toHaveBeenCalledWith('/cat/auth/signin');
  });

  it('redirects when the authenticated account is deleted', async () => {
    mocks.findUserByIdMock.mockResolvedValue({ deletedAt: new Date() });

    await ProfilePage({ params: Promise.resolve({ locale: 'es' }) });

    expect(mocks.redirectMock).toHaveBeenCalledWith('/es/auth/signin');
  });
});
