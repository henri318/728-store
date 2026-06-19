import { UserRepository } from '../../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import type { UpdateUserDTO } from '../dto/update-user.dto';

/** Default max length for firstName/lastName domain rule. */
const NAME_MAX_LENGTH = 50;

/** Allowed characters for names: letters (including accented), spaces, hyphens, apostrophes. */
const NAME_PATTERN = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;

function validateName(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new ValidationError(`${field} cannot exceed ${NAME_MAX_LENGTH} characters`);
  }
  if (!NAME_PATTERN.test(trimmed)) {
    throw new ValidationError(
      `${field} can only contain letters, spaces, hyphens, and apostrophes`,
    );
  }
  return trimmed;
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: UpdateUserDTO) {
    // 1. Find user
    const existing = await this.userRepository.findById(dto.userId);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const changedFields: string[] = [];

    // 2. Apply firstName if provided and different
    let firstName = existing.firstName;
    if (dto.firstName !== undefined) {
      const validated = validateName(dto.firstName, 'First name');
      if (validated !== existing.firstName) {
        firstName = validated;
        changedFields.push('firstName');
      }
    }

    // 3. Apply lastName if provided and different
    let lastName = existing.lastName;
    if (dto.lastName !== undefined) {
      const validated = validateName(dto.lastName, 'Last name');
      if (validated !== existing.lastName) {
        lastName = validated;
        changedFields.push('lastName');
      }
    }

    // 4. Apply address if provided and different
    let address = existing.address;
    if (dto.address !== undefined) {
      const newAddress = Address.create(
        dto.address.street,
        dto.address.city,
        dto.address.postalCode,
        dto.address.country,
      );
      if (!existing.address || !existing.address.equals(newAddress)) {
        address = newAddress;
        changedFields.push('address');
      }
    }

    // 5. Persist updated user
    const now = new Date();
    const updated = await this.userRepository.update({
      ...existing,
      firstName,
      lastName,
      address,
      updatedAt: now,
    });

    // 6. Emit event if anything changed
    if (changedFields.length > 0) {
      await this.outboxRepository.saveEvent(GlobalEvents.USER_UPDATED, {
        userId: updated.userId.value,
        changedFields,
      });
    }

    return updated;
  }
}
