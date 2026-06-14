import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Authentication Flow (Login, Session, Logout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const session = await getServerSession();
    expect(session).toBeNull();
  });

  it('should return user session when authenticated', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const session = await getServerSession();
    expect(session).toBeDefined();
    expect(session!.user.name).toBe('Test User');
  });

  it('should return null after logout', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser });

    const session = await getServerSession();
    expect(session!.user.name).toBe('Test User');

    vi.mocked(getServerSession).mockResolvedValue(null);

    const sessionAfterLogout = await getServerSession();
    expect(sessionAfterLogout).toBeNull();
  });
});
