import { NextRequest, NextResponse } from 'next/server';

async function getStorageRoot(): Promise<string> {
  const { join } = await import('node:path');
  return (
    process.env.LOCAL_UPLOAD_STORAGE_DIR ??
    join(process.cwd(), 'tmp', 'uploads')
  );
}

async function resolveStoragePath(
  storageKey: string[],
  root: string,
): Promise<string | null> {
  const { resolve, relative, isAbsolute } = await import('node:path');

  const decodedKey = decodeURIComponent(storageKey.join('/'));
  if (
    decodedKey.includes('\\') ||
    /^[a-zA-Z]:/.test(decodedKey) ||
    decodedKey.startsWith('/')
  ) {
    return null;
  }
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ storageKey: string[] }> },
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { mkdir, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');

  const { storageKey } = await context.params;
  const root = await getStorageRoot();
  const filePath = await resolveStoragePath(storageKey, root);
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
  const root = await getStorageRoot();
  const filePath = await resolveStoragePath(storageKey, root);
  if (!filePath) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
  }

  try {
    const { readFile } = await import('node:fs/promises');
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
