import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSellerUseCase } from '@/modules/sellers/application/use-cases/create-seller-use-case';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';

describe('CreateSellerUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: CreateSellerUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new CreateSellerUseCase(sellerRepository, outboxRepository);
  });

  it('should create a seller with valid input', async () => {
    const result = await useCase.execute({
      name: 'Test Shop',
      description: 'A test shop',
      userId: 'user-1',
    });

    expect(result.name).toBe('Test Shop');
    expect(result.description).toBe('A test shop');
    expect(result.userId).toBe('user-1');
    expect(result.status).toBe(SellerStatus.ACTIVE);
    expect(result.deletedAt).toBeNull();
    expect(result.sellerId).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a seller without description', async () => {
    const result = await useCase.execute({
      name: 'Minimal Shop',
      userId: 'user-2',
    });

    expect(result.name).toBe('Minimal Shop');
    expect(result.description).toBeNull();
    expect(result.userId).toBe('user-2');
  });

  it('should persist seller in repository', async () => {
    const result = await useCase.execute({
      name: 'Persisted Shop',
      userId: 'user-3',
    });

    const found = await sellerRepository.findById(result.sellerId.value);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Persisted Shop');
  });

  it('should record SELLER_CREATED event in outbox', async () => {
    const result = await useCase.execute({
      name: 'Event Shop',
      userId: 'user-4',
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
    expect(payload.name).toBe('Event Shop');
    expect(payload.userId).toBe('user-4');
  });

  it('should throw ValidationError when name is empty', async () => {
    await expect(
      useCase.execute({ name: '', userId: 'user-5' }),
    ).rejects.toThrow('Seller name is required');
  });

  it('should throw ValidationError when name is whitespace only', async () => {
    await expect(
      useCase.execute({ name: '   ', userId: 'user-6' }),
    ).rejects.toThrow('Seller name is required');
  });

  it('should throw ValidationError when userId is empty', async () => {
    await expect(
      useCase.execute({ name: 'Valid Shop', userId: '' }),
    ).rejects.toThrow('User ID is required');
  });

  it('should throw ConflictError when seller name already exists', async () => {
    await useCase.execute({ name: 'Unique Shop', userId: 'user-7' });

    await expect(
      useCase.execute({ name: 'Unique Shop', userId: 'user-8' }),
    ).rejects.toThrow('Seller name already exists');
  });

  it('should trim name before validation', async () => {
    const result = await useCase.execute({
      name: '  Trimmed Shop  ',
      userId: 'user-9',
    });

    expect(result.name).toBe('Trimmed Shop');
  });

  it('should reject duplicate name with different casing', async () => {
    await useCase.execute({ name: 'My Shop', userId: 'user-10' });

    await expect(
      useCase.execute({ name: 'my shop', userId: 'user-11' }),
    ).rejects.toThrow('Seller name already exists');
  });
});
