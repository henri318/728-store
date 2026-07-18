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

function toCoreAddressInput(
  fullAddress: UpdateUserDTO['fullAddress'],
  fallback: UpdateUserDTO['address'],
): UpdateUserDTO['address'] {
  if (fullAddress === undefined) return fallback;
  if (fullAddress === null) return null;
  return {
    street: fullAddress.street ?? '',
    city: fullAddress.city ?? '',
    postalCode: fullAddress.postalCode ?? '',
    country: fullAddress.country ?? '',
  };
}

async function persistFullAddress(
  repo: UserRepository,
  userId: string,
  fullAddress: UpdateUserDTO['fullAddress'],
): Promise<void> {
  if (fullAddress === undefined) return;
  if (fullAddress) {
    await repo.saveAddress(userId, fullAddress);
  } else {
    await repo.clearAddress(userId);
  }
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  private async getExistingUser(userId: string) {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError('User not found');
    }
    if (existing.deletedAt) {
      throw new UnauthorizedError('Account is deactivated');
    }
    return existing;
  }

  private resolveName(
    current: string,
    incoming: string | undefined,
    field: string,
    changedFields: string[],
  ): string {
    if (incoming === undefined) return current;
    const label = field === 'firstName' ? 'First name' : 'Last name';
    const validated = validateName(incoming, label);
    if (validated !== current) {
      changedFields.push(field);
    }
    return validated;
  }

  async execute(dto: UpdateUserDTO) {
    const existing = await this.getExistingUser(dto.userId);

    const changedFields: string[] = [];

    const firstName = this.resolveName(
      existing.firstName,
      dto.firstName,
      'firstName',
      changedFields,
    );
    const lastName = this.resolveName(
      existing.lastName,
      dto.lastName,
      'lastName',
      changedFields,
    );

    const coreAddress = toCoreAddressInput(dto.fullAddress, dto.address);
    const addressChange = resolveAddressChange(existing.address, coreAddress);
    const address = addressChange.address;
    if (addressChange.changed) changedFields.push('address');

    const now = new Date();
    const updated = await this.userRepository.update({
      ...existing,
      firstName,
      lastName,
      address,
      updatedAt: now,
    });

    await persistFullAddress(this.userRepository, dto.userId, dto.fullAddress);
    if (dto.fullAddress !== undefined && !addressChange.changed) {
      changedFields.push('address');
    }

    if (changedFields.length > 0) {
      await this.outboxRepository.saveEvent(GlobalEvents.USER_UPDATED, {
        userId: updated.userId.value,
        changedFields,
      });
    }

    return updated;
  }
}
