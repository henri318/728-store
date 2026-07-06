import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const tempDirs: string[] = [];

describe('PUT/GET /api/uploads/local/[...storageKey]', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    const dirs = [...tempDirs];
    tempDirs.length = 0;
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stores bytes locally and serves them back through GET', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), '728-store-uploads-'));
    tempDirs.push(dir);
    process.env.LOCAL_UPLOAD_STORAGE_DIR = dir;

    const { PUT, GET } =
      await import('@/app/api/uploads/local/[...storageKey]/route');

    const key = 'customization/user-1/photo.txt';
    const putRequest = new NextRequest(
      `http://localhost:3000/api/uploads/local/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        body: 'hello world',
        headers: { 'content-type': 'text/plain' },
      },
    );

    const putResponse = await PUT(putRequest, {
      params: Promise.resolve({ storageKey: [key] }),
    });

    expect(putResponse.status).toBe(204);

    const getResponse = await GET(
      new NextRequest(
        `http://localhost:3000/api/uploads/local/${encodeURIComponent(key)}`,
      ),
      { params: Promise.resolve({ storageKey: [key] }) },
    );

    expect(getResponse.status).toBe(200);
    expect(await getResponse.text()).toBe('hello world');
  });

  it.each([
    ['..%2Fsecret.txt'],
    ['..%2F..%2Fsecret.txt'],
    ['customization%2F..%2F..%2Fsecret.txt'],
    ['C%3A%5CWindows%5CSystem32%5Csecret.txt'],
  ])(
    'rejects storage keys that escape the local upload directory: %s',
    async (key) => {
      const dir = mkdtempSync(path.join(tmpdir(), '728-store-uploads-'));
      tempDirs.push(dir);
      process.env.LOCAL_UPLOAD_STORAGE_DIR = dir;

      const { PUT } =
        await import('@/app/api/uploads/local/[...storageKey]/route');

      const response = await PUT(
        new NextRequest(`http://localhost:3000/api/uploads/local/${key}`, {
          method: 'PUT',
          body: 'nope',
        }),
        { params: Promise.resolve({ storageKey: [key] }) },
      );

      expect(response.status).toBe(400);
    },
  );

  it('is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { PUT } =
      await import('@/app/api/uploads/local/[...storageKey]/route');

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/uploads/local/photo.txt', {
        method: 'PUT',
        body: 'nope',
      }),
      { params: Promise.resolve({ storageKey: ['photo.txt'] }) },
    );

    expect(response.status).toBe(404);
  });
});
