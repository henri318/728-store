import { createHash } from 'node:crypto';

export function buildIdempotencyKey(
  template: string,
  recipient: string,
  sourceEntityId: string,
): string {
  return createHash('sha256')
    .update(`${template}:${recipient}:${sourceEntityId}`)
    .digest('hex');
}
