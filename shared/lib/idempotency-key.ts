import { createHash } from 'node:crypto';

export function buildIdempotencyKey(
  template: string,
  recipient: string,
  sourceEntityId: string,
  timeWindow?: number,
): string {
  const parts = [template, recipient, sourceEntityId];

  if (timeWindow !== undefined) {
    parts.push(String(timeWindow));
  }

  return createHash('sha256').update(parts.join(':')).digest('hex');
}
