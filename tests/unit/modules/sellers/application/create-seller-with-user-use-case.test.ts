import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateSellerWithUserUseCase } from '@/modules/sellers/application/use-cases/create-seller-with-user-use-case';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryTransactionRunner } from '@/tests/doubles/memory-transaction-runner';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';

describe('CreateSellerWithUserUseCase', () => {
  let userRepository: MemoryUserRepository;
  let sellerRepository: MemorySellerRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;
  let transactionRunner: MemoryTransactionRunner;
  let useCase: CreateSellerWithUserUseCase;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    sellerRepository = new MemorySellerRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();
    transactionRunner = new MemoryTransactionRunner();
    useCase = new CreateSellerWithUserUseCase(
      userRepository,
      sellerRepository,
      outboxRepository,
      passwordHasher,
      transactionRunner,
    );
  });

  it('should create user + seller + outbox event atomically', async () => {
    const result = await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
      description: 'A brand new shop',
    });

    // 1. Returns the seller
    expect(result).toBeDefined();
    expect(result.name).toBe('New Shop');
    expect(result.userId).toBeDefined();
    expect(result.status).toBe(SellerStatus.ACTIVE);
    expect(result.deletedAt).toBeNull();
  });

  it('should persist the user with DESIGNER role', async () => {
    const result = await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
    });

    const user = await userRepository.findById(result.userId);
    expect(user).not.toBeNull();
    expect(user!.email.value).toBe('owner@shop.com');
    expect(user!.roleId.value).toBe('DESIGNER');
    expect(user!.firstName).toBe('Owner');
    expect(user!.lastName).toBe('Person');
  });

  it('should persist the seller with a hashed userId link', async () => {
    const result = await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
    });

    const seller = await sellerRepository.findById(result.sellerId.value);
    expect(seller).not.toBeNull();
    expect(seller!.name).toBe('New Shop');
    expect(seller!.userId).toBe(result.userId);
  });

  it('should record SELLER_CREATED event in the outbox', async () => {
    const result = await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
    });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      SellerEvents.SELLER_CREATED,
    );
    const payload = outboxRepository.events[0].payload as {
      sellerId: string;
      name: string;
      userId: string;
    };
    expect(payload.sellerId).toBe(result.sellerId.value);
    expect(payload.name).toBe('New Shop');
    expect(payload.userId).toBe(result.userId);
  });

  it('should hash the user password before persisting', async () => {
    const hashSpy = vi.spyOn(passwordHasher, 'hash');

    await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
    });

    expect(hashSpy).toHaveBeenCalledWith('password1');

    const user = await userRepository.findByEmail('owner@shop.com');
    expect(user).not.toBeNull();
    expect(user!.passwordHash.value).toBe('mem:password1');
  });

  it('should execute the work inside a transaction', async () => {
    const runSpy = vi.spyOn(transactionRunner, 'run');

    await useCase.execute({
      email: 'owner@shop.com',
      password: 'password1',
      firstName: 'Owner',
      lastName: 'Person',
      name: 'New Shop',
    });

    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw ConflictError when email already exists', async () => {
    // First call succeeds
    await useCase.execute({
      email: 'dup@shop.com',
      password: 'password1',
      firstName: 'A',
      lastName: 'B',
      name: 'Shop One',
    });

    // Second call with same email must fail BEFORE any work happens
    await expect(
      useCase.execute({
        email: 'dup@shop.com',
        password: 'password2',
        firstName: 'C',
        lastName: 'D',
        name: 'Shop Two',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw ConflictError when seller name already exists', async () => {
    await useCase.execute({
      email: 'first@shop.com',
      password: 'password1',
      firstName: 'A',
      lastName: 'B',
      name: 'Same Name',
    });

    await expect(
      useCase.execute({
        email: 'second@shop.com',
        password: 'password1',
        firstName: 'C',
        lastName: 'D',
        name: 'Same Name',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw ValidationError when seller name is empty', async () => {
    await expect(
      useCase.execute({
        email: 'a@b.com',
        password: 'password1',
        firstName: 'A',
        lastName: 'B',
        name: '   ',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should NOT create a user or seller when seller name conflicts', async () => {
    await useCase.execute({
      email: 'first@shop.com',
      password: 'password1',
      firstName: 'A',
      lastName: 'B',
      name: 'Conflict Name',
    });

    const sellersBefore = (await sellerRepository.findAll()).length;
    const usersBefore = (await userRepository.findByEmail('second@shop.com'))
      ? 1
      : 0;

    await expect(
      useCase.execute({
        email: 'second@shop.com',
        password: 'password1',
        firstName: 'C',
        lastName: 'D',
        name: 'Conflict Name',
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    // No new seller, no new user
    const sellersAfter = (await sellerRepository.findAll()).length;
    const usersAfter = (await userRepository.findByEmail('second@shop.com'))
      ? 1
      : 0;
    expect(sellersAfter).toBe(sellersBefore);
    expect(usersAfter).toBe(usersBefore);
  });

  it('should pass the transaction client to userRepository.save', async () => {
    const saveSpy = vi.spyOn(userRepository, 'save');

    await useCase.execute({
      email: 'tx-user@shop.com',
      password: 'password1',
      firstName: 'Tx',
      lastName: 'User',
      name: 'Tx User Shop',
    });

    // The second argument to save() must be the tx from the runner (undefined for in-memory)
    expect(saveSpy).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('should pass the transaction client to sellerRepository.save', async () => {
    const saveSpy = vi.spyOn(sellerRepository, 'save');

    await useCase.execute({
      email: 'tx-sel@shop.com',
      password: 'password1',
      firstName: 'Tx',
      lastName: 'Sel',
      name: 'Tx Sel Shop',
    });

    expect(saveSpy).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('should pass the transaction client to outboxRepository.saveEvent', async () => {
    const saveEventSpy = vi.spyOn(outboxRepository, 'saveEvent');

    await useCase.execute({
      email: 'tx-evt@shop.com',
      password: 'password1',
      firstName: 'Tx',
      lastName: 'Evt',
      name: 'Tx Evt Shop',
    });

    expect(saveEventSpy).toHaveBeenCalledWith(
      SellerEvents.SELLER_CREATED,
      expect.anything(),
      undefined,
    );
  });
});
