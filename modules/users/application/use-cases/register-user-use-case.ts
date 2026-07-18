import { UserRepository } from '../../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { ConflictError } from '@/shared/kernel/app-error';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import type { RegisterUserDTO } from '../dto/register-user.dto';
import { validateName } from '@/shared/validation/name-validator';

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
    private passwordHasher: PasswordHasher,
    private txRunner?: TransactionRunner,
  ) {}

  async execute(dto: RegisterUserDTO) {
    const run = <T>(fn: (tx: unknown) => Promise<T>) =>
      this.txRunner ? this.txRunner.run(fn) : fn(undefined);

    return run(async (tx) => {
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

      const address = dto.address
        ? Address.create(
            dto.address.street,
            dto.address.city,
            dto.address.postalCode,
            dto.address.country,
          )
        : null;

      // 5. Save user
      const now = new Date();
      const user = await this.userRepository.save(
        {
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
        },
        tx,
      );

      // 5b. Save full address details if provided
      if (dto.fullAddress) {
        await this.userRepository.saveAddress(
          user.userId.value,
          dto.fullAddress,
        );
      }

      // 6. Record event in Outbox with roleId
      await this.outboxRepository.saveEvent(
        GlobalEvents.USER_REGISTERED,
        {
          userId: user.userId.value,
          email: user.email.value,
          roleId: user.roleId.value,
        },
        tx,
      );

      return user;
    });
  }
}
