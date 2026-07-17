import { UserRepository } from '../../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError, UnauthorizedError } from '@/shared/kernel/app-error';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import type { UpdateUserDTO } from '../dto/update-user.dto';
import { validateName } from '@/shared/validation/name-validator';

function resolveAddressChange(
  existingAddress: Address | null,
  incomingAddress: UpdateUserDTO['address'],
) {
  if (incomingAddress === undefined) {
    return { address: existingAddress, changed: false };
  }
  if (incomingAddress === null) {
    return { address: null, changed: existingAddress !== null };
  }

  const address = Address.create(
    incomingAddress.street,
    incomingAddress.city,
    incomingAddress.postalCode,
    incomingAddress.country,
  );
  return {
    address,
    changed: !existingAddress || !existingAddress.equals(address),
  };
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

    // Reject if account is deactivated (soft-deleted)
    if (existing.deletedAt) {
      throw new UnauthorizedError('Account is deactivated');
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
    const addressChange = resolveAddressChange(existing.address, dto.address);
    const address = addressChange.address;
    if (addressChange.changed) changedFields.push('address');

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
