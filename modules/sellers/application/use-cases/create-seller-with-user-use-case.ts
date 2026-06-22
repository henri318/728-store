import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';

/**
 * Input for the atomic "create a seller (and their user account)" flow.
 *
 * Combines user-creation fields (email, password, firstName, lastName) with
 * seller-creation fields (name, description) so the caller only has to
 * invoke ONE use case. Both the User row and the Seller row are persisted
 * (with the SELLER_CREATED outbox event) inside a single transaction —
 * either all three writes commit, or none of them do.
 */
export interface CreateSellerWithUserDTO {
  // User fields
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // Seller fields
  name: string;
  description?: string;
}

/**
 * CreateSellerWithUserUseCase — atomically creates a new user (with the
 * SELLER role) and a new seller profile, then records a SELLER_CREATED
 * domain event. All three writes happen inside ONE Prisma transaction.
 *
 * This is the single-entry-point for admin "add a new seller" flows.
 * Existing `CreateSellerUseCase` remains for the (test-only) case where
 * the user row already exists and only the seller profile must be added.
 */
export class CreateSellerWithUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(dto: CreateSellerWithUserDTO) {
    // 1. Validate seller name
    const trimmedName = dto.name?.trim() ?? '';
    if (!trimmedName) {
      throw new ValidationError('Seller name is required');
    }

    return this.transactionRunner.run(async (tx) => {
      // 2. Pre-flight uniqueness check (email)
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictError('User already exists');
      }

      // 3. Pre-flight uniqueness check (seller name)
      const existingByName =
        await this.sellerRepository.findByName(trimmedName);
      if (existingByName) {
        throw new ConflictError('Seller name already exists');
      }

      // 4. Hash password
      const passwordHash = PasswordHash.create(
        await this.passwordHasher.hash(dto.password),
      );

      // 5. Create user (with SELLER role) — same transaction
      const now = new Date();
      const userId = UserId.create(crypto.randomUUID());
      const user = await this.userRepository.save(
        {
          userId,
          email: Email.create(dto.email),
          firstName: dto.firstName,
          lastName: dto.lastName,
          address: null,
          roleId: RoleId.create('SELLER'),
          passwordHash,
          emailVerified: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );

      // 6. Create seller linked to the new user — same transaction
      const seller = await this.sellerRepository.save(
        {
          sellerId: SellerId.create(crypto.randomUUID()),
          name: trimmedName,
          description: dto.description?.trim() ?? null,
          userId: user.userId.value,
          status: SellerStatus.ACTIVE,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );

      // 7. Record SELLER_CREATED event — same transaction
      await this.outboxRepository.saveEvent(
        SellerEvents.SELLER_CREATED,
        {
          sellerId: seller.sellerId.value,
          name: seller.name,
          userId: seller.userId,
        },
        tx,
      );

      return seller;
    });
  }
}
