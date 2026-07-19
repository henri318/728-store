import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseDesignPosition } from '@/app/[locale]/products/[id]/page';

describe('parseDesignPosition', () => {
  const validPosition = {
    imageUrl: 'https://cdn.example.com/design.png',
    x: 0.5,
    y: 0.5,
    scale: 100,
    rotation_deg: 0,
    opacity: 100,
    blend_mode: 'source-over',
  };

  it('returns a complete valid position', () => {
    expect(parseDesignPosition(JSON.stringify(validPosition))).toEqual(
      validPosition,
    );
  });

  it.each([
    'not-json',
    'null',
    JSON.stringify({ ...validPosition, imageUrl: '' }),
    JSON.stringify({ ...validPosition, blend_mode: 'invalid' }),
    JSON.stringify({ ...validPosition, x: '0.5' }),
    JSON.stringify(validPosition).replace('"opacity":100', '"opacity":1e400'),
  ])('returns null for an invalid position: %s', (value) => {
    expect(parseDesignPosition(value)).toBeNull();
  });
});
