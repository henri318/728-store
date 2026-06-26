import { describe, it, expect } from 'vitest';
import { CartId } from '@/modules/cart/domain/value-objects/cart-id';
import { OrderId } from '@/shared/kernel/domain/value-objects/order-id';

/**
 * Task 1.x — CartId value object.
 *
 * Extends EntityId: stores a non-empty string, equals compares by class+value.
 * Tests the contract end-to-end because the value object has no behavior of
 * its own beyond identity.
 */
describe('CartId', () => {
  it('creates an instance with the provided value', () => {
    const id = CartId.create('cart-123');
    expect(id).toBeInstanceOf(CartId);
    expect(id.value).toBe('cart-123');
  });

  it('rejects an empty string', () => {
    expect(() => CartId.create('')).toThrow('EntityId cannot be empty');
  });

  it('rejects whitespace-only strings', () => {
    expect(() => CartId.create('   ')).toThrow('EntityId cannot be empty');
  });

  it('trims surrounding whitespace', () => {
    const id = CartId.create('  cart-456  ');
    expect(id.value).toBe('cart-456');
  });

  it('equals returns true for the same value', () => {
    const a = CartId.create('cart-1');
    const b = CartId.create('cart-1');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = CartId.create('cart-1');
    const b = CartId.create('cart-2');
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false across subclasses even with the same value', () => {
    const cartId = CartId.create('same');
    const orderId = OrderId.create('same');
    expect(cartId.equals(orderId)).toBe(false);
  });

  it('toString returns the underlying value', () => {
    const id = CartId.create('cart-789');
    expect(id.toString()).toBe('cart-789');
  });
});
