import { describe, it, expect } from 'vitest';
import { CartItemId } from '@/modules/cart/domain/value-objects/cart-item-id';
import { CartId } from '@/modules/cart/domain/value-objects/cart-id';

/**
 * Task 1.x — CartItemId value object.
 *
 * Extends EntityId: stores a non-empty string, equals compares by class+value.
 * The class identity matters because CartId and CartItemId must not be
 * considered equal even when their string values match.
 */
describe('CartItemId', () => {
  it('creates an instance with the provided value', () => {
    const id = CartItemId.create('item-123');
    expect(id).toBeInstanceOf(CartItemId);
    expect(id.value).toBe('item-123');
  });

  it('rejects an empty string', () => {
    expect(() => CartItemId.create('')).toThrow('EntityId cannot be empty');
  });

  it('rejects whitespace-only strings', () => {
    expect(() => CartItemId.create('   ')).toThrow('EntityId cannot be empty');
  });

  it('trims surrounding whitespace', () => {
    const id = CartItemId.create('  item-456  ');
    expect(id.value).toBe('item-456');
  });

  it('equals returns true for the same value', () => {
    const a = CartItemId.create('item-1');
    const b = CartItemId.create('item-1');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = CartItemId.create('item-1');
    const b = CartItemId.create('item-2');
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false across subclasses even with the same value', () => {
    const itemId = CartItemId.create('same');
    const cartId = CartId.create('same');
    expect(itemId.equals(cartId)).toBe(false);
  });

  it('toString returns the underlying value', () => {
    const id = CartItemId.create('item-789');
    expect(id.toString()).toBe('item-789');
  });
});
