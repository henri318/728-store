import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/shared/kernel/app-error';
import type { Money } from '@/shared/kernel/domain/value-objects/money';

/**
 * Cart module domain errors.
 *
 * Each error extends AppError (or a typed subclass) and carries the HTTP
 * status code that handleApiError uses to map it to a response.
 */

export class CartNotFoundError extends NotFoundError {
  constructor(message: string = 'Cart not found', safeMessage?: string) {
    super(message, safeMessage);
    this.name = 'CartNotFoundError';
  }
}

export class CartImmutableError extends ConflictError {
  constructor(
    message: string = 'Cart is immutable (already checked out)',
    safeMessage?: string,
  ) {
    super(message, safeMessage);
    this.name = 'CartImmutableError';
  }
}

export class CartAlreadyActiveError extends ConflictError {
  constructor(
    message: string = 'User already has an active cart',
    safeMessage: string = 'You already have an active cart',
  ) {
    super(message, safeMessage);
    this.name = 'CartAlreadyActiveError';
  }
}

export class InvalidQuantityError extends ValidationError {
  constructor(
    message: string = 'Quantity must be an integer between 1 and 99',
    safeMessage?: string,
  ) {
    super(message, safeMessage);
    this.name = 'InvalidQuantityError';
  }
}

export class EmptyCartError extends AppError {
  constructor(
    message: string = 'Cart is empty',
    safeMessage: string = 'Your cart is empty',
  ) {
    super(message, 422, safeMessage);
    this.name = 'EmptyCartError';
  }
}

export interface PriceChange {
  itemId: string;
  oldPrice: Money;
  newPrice: Money;
}

export class PriceChangedError extends ConflictError {
  public readonly priceChanges: PriceChange[];

  constructor(
    message: string = 'Product prices have changed',
    priceChanges: PriceChange[] = [],
    safeMessage?: string,
  ) {
    super(message, safeMessage);
    this.priceChanges = priceChanges;
    this.name = 'PriceChangedError';
  }
}

export class ItemNotFoundError extends NotFoundError {
  constructor(message: string = 'Cart item not found', safeMessage?: string) {
    super(message, safeMessage);
    this.name = 'ItemNotFoundError';
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(message: string = 'Product not found', safeMessage?: string) {
    super(message, safeMessage);
    this.name = 'ProductNotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Forbidden',
    safeMessage: string = 'You do not have permission to perform this action',
  ) {
    super(message, 403, safeMessage);
    this.name = 'ForbiddenError';
  }
}

export class CartMergeError extends ConflictError {
  constructor(message: string = 'Cart merge failed', safeMessage?: string) {
    super(message, safeMessage);
    this.name = 'CartMergeError';
  }
}

export class InvalidCustomizationError extends ValidationError {
  constructor(
    message: string = 'One or more customization IDs are invalid',
    safeMessage: string = 'Invalid customization selected',
  ) {
    super(message, safeMessage);
    this.name = 'InvalidCustomizationError';
  }
}
