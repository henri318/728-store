import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const STORAGE_ROOT =
  process.env.LOCAL_UPLOAD_STORAGE_DIR ?? join(process.cwd(), 'tmp', 'uploads');

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ storageKey: string[] }> },
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { storageKey } = await context.params;
  const filePath = resolveStoragePath(storageKey);
  if (!filePath) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
  }

  await mkdir(dirname(filePath), { recursive: true });

  const body = Buffer.from(await request.arrayBuffer());
  await writeFile(filePath, body);

  return new NextResponse(null, { status: 204 });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ storageKey: string[] }> },
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { storageKey } = await context.params;
  const filePath = resolveStoragePath(storageKey);
  if (!filePath) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
  }

  try {
    const body = await readFile(filePath);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': guessContentType(filePath),
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

function resolveStoragePath(storageKey: string[]): string | null {
  const root = resolve(STORAGE_ROOT);
  const decodedKey = decodeURIComponent(storageKey.join('/'));
  const segments = decodedKey.split('/').filter(Boolean);

  const rawPath = resolve(root, ...segments);
  const rawRelative = relative(root, rawPath);
  if (rawRelative.startsWith('..') || isAbsolute(rawRelative)) {
    return null;
  }

  const sanitized = segments.map((s) => s.replace(/[:*?"<>|]/g, '_'));
  const filePath = resolve(root, ...sanitized);

  return filePath;
}

function guessContentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}
