import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/shared/kernel/app-error';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import {
  CartNotFoundError,
  CartImmutableError,
  CartAlreadyActiveError,
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
      expect(typeof e.safeMessage).toBe('string');
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

    it('exposes a safe default message when none is given', () => {
      const e = new CartImmutableError();
      expect(e.safeMessage).toBeTruthy();
    });
  });

  describe('CartAlreadyActiveError', () => {
    it('is an AppError with status 409', () => {
      const e = new CartAlreadyActiveError('user already active');
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ConflictError);
      expect(e.statusCode).toBe(409);
      expect(e.name).toBe('CartAlreadyActiveError');
    });

    it('exposes a safe default message when none is given', () => {
      const e = new CartAlreadyActiveError();
      expect(e.safeMessage).toBeTruthy();
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

    it('exposes a safe default message when none is given', () => {
      const e = new InvalidQuantityError();
      expect(e.safeMessage).toBeTruthy();
    });
  });

  describe('EmptyCartError', () => {
    it('is an AppError with status 422', () => {
      const e = new EmptyCartError('cart is empty');
      expect(e).toBeInstanceOf(AppError);
      expect(e.statusCode).toBe(422);
      expect(e.name).toBe('EmptyCartError');
    });

    it('exposes a safe default message when none is given', () => {
      const e = new EmptyCartError();
      expect(e.safeMessage).toBeTruthy();
    });
  });

  describe('PriceChangedError', () => {
    it('is an AppError with status 409', () => {
      const e = new PriceChangedError('prices changed', [
        {
          itemId: 'i1',
          oldPrice: Money.create(10, Currency.EUR),
          newPrice: Money.create(12, Currency.EUR),
        },
      ]);
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(ConflictError);
      expect(e.statusCode).toBe(409);
      expect(e.name).toBe('PriceChangedError');
    });

    it('exposes the priceChanges array on the error instance', () => {
      const changes = [
        {
          itemId: 'i1',
          oldPrice: Money.create(10, Currency.EUR),
          newPrice: Money.create(12, Currency.EUR),
        },
        {
          itemId: 'i2',
          oldPrice: Money.create(5, Currency.EUR),
          newPrice: Money.create(4, Currency.EUR),
        },
      ];
      const e = new PriceChangedError('prices changed', changes);
      expect(e.priceChanges).toEqual(changes);
      expect(e.priceChanges).toHaveLength(2);
    });

    it('defaults to an empty priceChanges array', () => {
      const e = new PriceChangedError('prices changed');
      expect(e.priceChanges).toEqual([]);
    });

    it('exposes a safe default message when none is given', () => {
      const e = new PriceChangedError();
      expect(e.safeMessage).toBeTruthy();
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

    it('exposes a safe default message when none is given', () => {
      const e = new ItemNotFoundError();
      expect(e.safeMessage).toBeTruthy();
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

    it('exposes a safe default message when none is given', () => {
      const e = new ProductNotFoundError();
      expect(e.safeMessage).toBeTruthy();
    });
  });

  describe('ForbiddenError', () => {
    it('is an AppError with status 403', () => {
      const e = new ForbiddenError('forbidden');
      expect(e).toBeInstanceOf(AppError);
      expect(e.statusCode).toBe(403);
      expect(e.name).toBe('ForbiddenError');
    });

    it('exposes a safe default message when none is given', () => {
      const e = new ForbiddenError();
      expect(e.safeMessage).toBeTruthy();
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

    it('exposes a safe default message when none is given', () => {
      const e = new CartMergeError();
      expect(e.safeMessage).toBeTruthy();
    });
  });
});
