import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist mocks
const mocks = vi.hoisted(() => {
  const findPendingOlderThanMock = vi.fn();
  const removeMock = vi.fn();
  const deleteMock = vi.fn();

  return {
    findPendingOlderThanMock,
    removeMock,
    deleteMock,
  };
});

vi.mock('@/composition-root/container', () => ({
  container: {
    getUploadRepository: () => ({
      findPendingOlderThan: mocks.findPendingOlderThanMock,
      remove: mocks.removeMock,
    }),
    getStoragePort: () => ({
      delete: mocks.deleteMock,
    }),
  },
}));

// Import after mocks
import { GET } from '@/app/api/cron/cleanup-uploads/route';

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost:3000/api/cron/cleanup-uploads', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/cron/cleanup-uploads', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    mocks.findPendingOlderThanMock.mockReset();
    mocks.removeMock.mockReset();
    mocks.deleteMock.mockReset();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('authorization', () => {
    it('returns 401 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;

      const response = await GET(makeRequest('Bearer any-secret'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when authorization header is missing', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const response = await GET(makeRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when authorization header format is wrong', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const response = await GET(makeRequest('Basic wrong-format'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when secret does not match', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const response = await GET(makeRequest('Bearer wrong-secret'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('successful cleanup', () => {
    it('executes cleanup and returns result when authorized', async () => {
      process.env.CRON_SECRET = 'test-secret';

      // Mock: 2 old pending uploads
      const oldUploads = [
        { id: 'upload-1', storageKey: 'key-1' },
        { id: 'upload-2', storageKey: 'key-2' },
      ];
      mocks.findPendingOlderThanMock.mockResolvedValue(oldUploads);
      mocks.deleteMock.mockResolvedValue(undefined);
      mocks.removeMock.mockResolvedValue(undefined);

      const response = await GET(makeRequest('Bearer test-secret'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ deleted: 2, errors: 0 });

      // Verify cleanup was called for each upload
      expect(mocks.findPendingOlderThanMock).toHaveBeenCalledWith(24);
      expect(mocks.deleteMock).toHaveBeenCalledTimes(2);
      expect(mocks.removeMock).toHaveBeenCalledTimes(2);
    });

    it('returns zero counts when no old uploads exist', async () => {
      process.env.CRON_SECRET = 'test-secret';

      mocks.findPendingOlderThanMock.mockResolvedValue([]);

      const response = await GET(makeRequest('Bearer test-secret'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ deleted: 0, errors: 0 });
    });

    it('handles partial failures gracefully', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const oldUploads = [
        { id: 'upload-1', storageKey: 'key-1' },
        { id: 'upload-2', storageKey: 'key-2' },
      ];
      mocks.findPendingOlderThanMock.mockResolvedValue(oldUploads);

      // First upload fails, second succeeds
      mocks.deleteMock
        .mockRejectedValueOnce(new Error('R2 error'))
        .mockResolvedValueOnce(undefined);
      mocks.removeMock.mockResolvedValue(undefined);

      const response = await GET(makeRequest('Bearer test-secret'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ deleted: 1, errors: 1 });
    });
  });

  describe('error handling', () => {
    it('returns 500 when unexpected error occurs', async () => {
      process.env.CRON_SECRET = 'test-secret';

      mocks.findPendingOlderThanMock.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await GET(makeRequest('Bearer test-secret'));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
