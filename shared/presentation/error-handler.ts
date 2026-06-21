import { NextResponse } from 'next/server';
import { AppError } from '@/shared/kernel/app-error';
import { ZodError } from 'zod';

/**
 * Centralized API error handler.
 *
 * Lives in `shared/presentation/` because it's only used by the HTTP
 * presentation layer (Next.js route handlers) — it depends on NextResponse
 * and is the only place that knows how to render `AppError` / `ZodError`
 * into JSON responses.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.safeMessage },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    const formatted = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return NextResponse.json(
      { error: 'Validation failed', details: formatted },
      { status: 400 },
    );
  }

  // Unknown error — log the real one, return safe message
  console.error('[UnhandledError]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
