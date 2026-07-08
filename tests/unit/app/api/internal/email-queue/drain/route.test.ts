import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  drainMock: vi.fn(),
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getEmailQueueDrainService: () => ({
      drain: mocks.drainMock,
    }),
  },
}));

import { POST } from '@/app/api/internal/email-queue/drain/route';

function makeRequest(secret?: string, batchSize?: number): NextRequest {
  const url = new URL('http://localhost:3000/api/internal/email-queue/drain');
  if (batchSize !== undefined) {
    url.searchParams.set('batchSize', String(batchSize));
  }

  const headers = new Headers();
  if (secret) {
    headers.set('x-internal-jobs-secret', secret);
  }

  return new NextRequest(url, {
    method: 'POST',
    headers,
  });
}

describe('POST /api/internal/email-queue/drain', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    mocks.drainMock.mockReset();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 401 when the internal jobs secret is missing or invalid', async () => {
    process.env.INTERNAL_JOBS_SECRET = 'test-secret';

    const missingSecretResponse = await POST(makeRequest());
    const invalidSecretResponse = await POST(makeRequest('wrong-secret'));

    expect(missingSecretResponse.status).toBe(401);
    expect(await missingSecretResponse.json()).toEqual({
      error: 'Unauthorized',
    });
    expect(invalidSecretResponse.status).toBe(401);
    expect(await invalidSecretResponse.json()).toEqual({
      error: 'Unauthorized',
    });
    expect(mocks.drainMock).not.toHaveBeenCalled();
  });

  it('drains queued emails when authorized and returns safe counts', async () => {
    process.env.INTERNAL_JOBS_SECRET = 'test-secret';
    mocks.drainMock.mockResolvedValue({
      claimed: 2,
      sent: 1,
      rescheduled: 1,
      failed: 0,
    });

    const response = await POST(makeRequest('test-secret', 5));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      claimed: 2,
      sent: 1,
      rescheduled: 1,
      failed: 0,
    });
    expect(mocks.drainMock).toHaveBeenCalledWith({
      batchSize: 5,
      source: 'http',
    });
  });
});
