import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ZodSchema } from 'zod';
import { container } from '@/composition-root/container';

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await container.getSession().getSession();
  return session?.id ?? null;
}

export async function getRouteParams<T extends Record<string, string>>(
  context: unknown,
): Promise<T> {
  return (await (context as { params: Promise<T> }).params) as T;
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export async function getCurrentSellerId(): Promise<string | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const seller = await container.getSellerRepository().findByUserId(userId);
  return seller?.sellerId.value ?? null;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
