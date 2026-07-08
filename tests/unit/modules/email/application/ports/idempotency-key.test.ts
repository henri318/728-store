import { describe, expect, it } from 'vitest';
import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';

describe('buildIdempotencyKey', () => {
  it('returns the same key for the same template, recipient, and source entity', () => {
    const first = buildIdempotencyKey(
      'password-reset',
      'user@test.com',
      'user-1',
    );
    const second = buildIdempotencyKey(
      'password-reset',
      'user@test.com',
      'user-1',
    );

    expect(first).toBe(second);
  });

  it('returns different keys when any input changes', () => {
    const base = buildIdempotencyKey(
      'password-reset',
      'user@test.com',
      'user-1',
    );

    expect(
      buildIdempotencyKey('seller-created', 'user@test.com', 'user-1'),
    ).not.toBe(base);
    expect(
      buildIdempotencyKey('password-reset', 'other@test.com', 'user-1'),
    ).not.toBe(base);
    expect(
      buildIdempotencyKey('password-reset', 'user@test.com', 'user-2'),
    ).not.toBe(base);
  });

  it('returns a stable 64-character hex digest for special-character inputs', () => {
    const key = buildIdempotencyKey(
      'verification',
      'user+test@example.com',
      'entity/1?x=1&y=2#frag',
    );

    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns the same key when the same time window is provided', () => {
    const first = buildIdempotencyKey(
      'verification',
      'user@test.com',
      'user-1',
      12_345,
    );
    const second = buildIdempotencyKey(
      'verification',
      'user@test.com',
      'user-1',
      12_345,
    );

    expect(first).toBe(second);
  });

  it('returns different keys when the time window changes', () => {
    const base = buildIdempotencyKey(
      'verification',
      'user@test.com',
      'user-1',
      12_345,
    );

    expect(
      buildIdempotencyKey('verification', 'user@test.com', 'user-1', 12_346),
    ).not.toBe(base);
  });
});
