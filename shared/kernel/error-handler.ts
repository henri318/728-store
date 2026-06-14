import { NextResponse } from 'next/server';
import { AppError } from './app-error';
import { ZodError } from 'zod';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.safeMessage },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const formatted = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return NextResponse.json(
      { error: 'Validation failed', details: formatted },
      { status: 400 }
    );
  }

  // Unknown error — log the real one, return safe message
  console.error('[UnhandledError]', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
