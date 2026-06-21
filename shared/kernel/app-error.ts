// Domain error base
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly safeMessage: string = 'Internal server error',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific domain errors
export class NotFoundError extends AppError {
  constructor(message: string, safeMessage?: string) {
    super(message, 404, safeMessage || 'Resource not found');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, safeMessage?: string) {
    super(message, 400, safeMessage || 'Invalid input');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, safeMessage?: string) {
    super(message, 401, safeMessage || 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, safeMessage?: string) {
    super(message, 409, safeMessage || 'Resource already exists');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string,
    safeMessage?: string,
    public retryAfterSeconds?: number,
  ) {
    super(message, 429, safeMessage || 'Too many requests');
    this.name = 'RateLimitError';
  }
}
