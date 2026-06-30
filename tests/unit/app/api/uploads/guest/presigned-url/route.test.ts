import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const saveMock = vi.fn();
  const uploadUrlMock = vi.fn(async () => 'https://r2.example.com/upload');
  const rateLimitMock = vi.fn(async () => ({ blocked: false }));
  const recordAttemptMock = vi.fn(async () => undefined);

  return {
    saveMock,
    uploadUrlMock,
    rateLimitMock,
    recordAttemptMock,
  };
});

vi.mock('@/composition-root/container', () => ({
  container: {
    getUploadRepository: () => ({
      save: mocks.saveMock,
    }),
    getStoragePort: () => ({
      generateUploadUrl: mocks.uploadUrlMock,
      generateReadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      delete: vi.fn(),
    }),
    getRateLimiter: () => ({
      checkRateLimit: mocks.rateLimitMock,
      recordLoginAttempt: mocks.recordAttemptMock,
    }),
  },
}));

import { POST } from '@/app/api/uploads/guest/presigned-url/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/uploads/guest/presigned-url',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.5',
        'user-agent': 'Vitest',
        'accept-language': 'en-US',
      },
    },
  );
}

describe('POST /api/uploads/guest/presigned-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when the body is invalid', async () => {
    const res = await POST(makeRequest({ fileName: '' }));
    expect(res.status).toBe(400);
  });

  it('creates a guest customization upload without authentication', async () => {
    mocks.saveMock.mockResolvedValue(undefined);

    const res = await POST(
      makeRequest({
        fileName: 'mug.png',
        mimeType: 'image/png',
        size: 1024,
      }),
    );

    expect(res.status).toBe(201);
    expect(mocks.saveMock).toHaveBeenCalledTimes(1);

    const savedUpload = mocks.saveMock.mock.calls[0][0] as { type: string };
    expect(savedUpload.type).toBe('customization');
    expect(mocks.rateLimitMock).toHaveBeenCalledTimes(1);
    expect(mocks.recordAttemptMock).toHaveBeenCalledTimes(1);
  });
});
