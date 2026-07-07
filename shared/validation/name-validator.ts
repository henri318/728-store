import { ValidationError } from '@/shared/kernel/app-error';

const NAME_MAX_LENGTH = 50;

const NAME_PATTERN = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;

export function validateName(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new ValidationError(
      `${field} cannot exceed ${NAME_MAX_LENGTH} characters`,
    );
  }
  if (!NAME_PATTERN.test(trimmed)) {
    throw new ValidationError(
      `${field} can only contain letters, spaces, hyphens, and apostrophes`,
    );
  }
  return trimmed;
}
