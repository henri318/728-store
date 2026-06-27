import {
  AppError,
  NotFoundError,
  ConflictError,
} from '@/shared/kernel/app-error';

/**
 * Customizations module domain errors.
 *
 * Each error carries the HTTP status code that handleApiError uses
 * to map it to a response.
 */

export class CustomizationNotFoundError extends NotFoundError {
  constructor(
    message: string = 'Customization not found',
    safeMessage?: string,
  ) {
    super(message, safeMessage);
    this.name = 'CustomizationNotFoundError';
  }
}

export class CustomizationForbiddenError extends AppError {
  constructor(
    message: string = 'You do not own this customization',
    safeMessage: string = 'You do not have permission to modify this customization',
  ) {
    super(message, 403, safeMessage);
    this.name = 'CustomizationForbiddenError';
  }
}

export class CustomizationInUseError extends ConflictError {
  constructor(
    message: string = 'Customization is referenced by an order and cannot be deleted',
    safeMessage: string = 'This customization is in use by an order and cannot be deleted',
  ) {
    super(message, safeMessage);
    this.name = 'CustomizationInUseError';
  }
}
