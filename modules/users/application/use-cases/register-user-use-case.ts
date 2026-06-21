import { UserRepository } from '../../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import type { RegisterUserDTO } from '../dto/register-user.dto';

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

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
    private passwordHasher: PasswordHasher,
  ) {}

  async execute(dto: RegisterUserDTO) {
    // 1. Validate names
    const firstName = validateName(dto.firstName, 'First name');
    const lastName = validateName(dto.lastName, 'Last name');

    // 2. Check if user already exists (by raw email string before VO creation)
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // 4. Construct Value Objects
    const email = Email.create(dto.email);
    const passwordHash = PasswordHash.create(
      await this.passwordHasher.hash(dto.password),
    );
    const userId = UserId.create(crypto.randomUUID());
    const roleId = RoleId.create('CUSTOMER');

    let address: Address | null = null;
    if (dto.address) {
      address = Address.create(
        dto.address.street,
        dto.address.city,
        dto.address.postalCode,
        dto.address.country,
      );
    }

    // 5. Save user
    const now = new Date();
    const user = await this.userRepository.save({
      userId,
      email,
      firstName,
      lastName,
      address,
      roleId,
      passwordHash,
      emailVerified: null,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Record event in Outbox with roleId
    await this.outboxRepository.saveEvent(GlobalEvents.USER_REGISTERED, {
      userId: user.userId.value,
      email: user.email.value,
      roleId: user.roleId.value,
    });

    return user;
  }
}
