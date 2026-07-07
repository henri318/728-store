import { type ZodIssue, type ZodSchema, ZodError } from 'zod';

export function validateForm<T extends Record<string, unknown>>(
  data: unknown,
  schema: ZodSchema<T>,
  applyIssue: (errors: T, issue: ZodIssue) => void,
): T | null {
  const result = schema.safeParse(data);
  if (result.success) return null;

  const errors = {} as T;
  const issues = (result.error as ZodError).issues ?? [];

  for (const issue of issues) {
    applyIssue(errors, issue);
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
