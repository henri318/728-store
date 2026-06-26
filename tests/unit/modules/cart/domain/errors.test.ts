import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/shared/kernel/app-error';
import {
  CartNotFoundError,
  CartImmutableError,
  InvalidQuantityError,
  EmptyCartError,
  PriceChangedError,
  ItemNotFoundError,
  ProductNotFoundError,
  ForbiddenError,
  CartMergeError,
} from '@/modules/cart/domain/errors';

/**
 * Task 1.x — Cart domain errors.
 *
 * Each error must:
 * - extend AppError (typed catch in handleApiError)
 * - carry a specific HTTP status (404 / 409 / 400 / 403)
 * - expose the right payload (PriceChangedError carries priceChanges[])
 * - be instantiable with no arguments (safe defaults)
 */
describe('Cart domain errors', () => {
  describe('CartNotFoundError', () => {
    it('is an AppError with status 404', () => {
      const e = new CartNotFoundError('cart not found');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(NotFoundError);
      expect(e.statusCode).toBe(404);
      expect(e.name).toBe('CartNotFoundError');
    });

    it('exposes a safe default message when none is given', () => {
      const e = new CartNotFoundError();
      expect(e.safeMessage).toBeTruthy();
    });
  });

  describe('CartImmutableError', () => {
    it('is an AppError with status 409', () => {
      const e = new CartImmutableError('cart checked out');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ConflictError);
      expect(e.statusCode).toBe(409);
      expect(e.name).toBe('CartImmutableError');
    });
  });

  describe('InvalidQuantityError', () => {
    it('is an AppError with status 400', () => {
      const e = new InvalidQuantityError('bad qty');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.statusCode).toBe(400);
      expect(e.name).toBe('InvalidQuantityError');
    });
  });

  describe('EmptyCartError', () => {
    it('is an AppError with status 422', () => {
      const e = new EmptyCartError('cart is empty');
      expect(e).toBeInstanceOf(AppError);
      expect(e.statusCode).toBe(422);
      expect(e.name).toBe('EmptyCartError');
    });
  });

  describe('PriceChangedError', () => {
    it('is an AppError with status 409', () => {
      const e = new PriceChangedError('prices changed', [
        { itemId: 'i1', oldPrice: 10, newPrice: 12 },
      ]);
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ConflictError);
      expect(e.statusCode).toBe(409);
      expect(e.name).toBe('PriceChangedError');
    });

    it('exposes the priceChanges array on the error instance', () => {
      const changes = [
        { itemId: 'i1', oldPrice: 10, newPrice: 12 },
        { itemId: 'i2', oldPrice: 5, newPrice: 4 },
      ];
      const e = new PriceChangedError('prices changed', changes);
      expect(e.priceChanges).toEqual(changes);
      expect(e.priceChanges).toHaveLength(2);
    });

    it('defaults to an empty priceChanges array', () => {
      const e = new PriceChangedError('prices changed');
      expect(e.priceChanges).toEqual([]);
    });
  });

  describe('ItemNotFoundError', () => {
    it('is an AppError with status 404', () => {
      const e = new ItemNotFoundError('item not found');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(NotFoundError);
      expect(e.statusCode).toBe(404);
      expect(e.name).toBe('ItemNotFoundError');
    });
  });

  describe('ProductNotFoundError', () => {
    it('is an AppError with status 404', () => {
      const e = new ProductNotFoundError('product not found');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(NotFoundError);
      expect(e.statusCode).toBe(404);
      expect(e.name).toBe('ProductNotFoundError');
    });
  });

  describe('ForbiddenError', () => {
    it('is an AppError with status 403', () => {
      const e = new ForbiddenError('forbidden');
      expect(e).toBeInstanceOf(AppError);
      expect(e.statusCode).toBe(403);
      expect(e.name).toBe('ForbiddenError');
    });
  });

  describe('CartMergeError', () => {
    it('is an AppError with status 409', () => {
      const e = new CartMergeError('merge failed');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ConflictError);
      expect(e.statusCode).toBe(409);
      expect(e.name).toBe('CartMergeError');
    });
  });
});
