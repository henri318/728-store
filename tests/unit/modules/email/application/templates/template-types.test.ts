import { describe, expect, it } from 'vitest';
import { formatMoneyLabel } from '@/modules/email/application/templates/template-types';

describe('formatMoneyLabel', () => {
  it.each([NaN, Infinity, -Infinity])(
    'falls back to 0.00 for non-finite amount %s',
    (amount) => {
      expect(formatMoneyLabel(amount, 'EUR')).toBe('EUR 0.00');
    },
  );

  it('formats a normal amount unchanged', () => {
    expect(formatMoneyLabel(125.5, 'EUR')).toBe('EUR 125.50');
  });
});
