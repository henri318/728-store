import { describe, it, expect, beforeEach } from 'vitest';
import { CreateCustomization } from '../create-customization';
import { UpdateCustomization } from '../update-customization';
import { DeleteCustomization } from '../delete-customization';
import type { CustomizationRepository } from '../../domain/customization-repository';
import type { CustomizationEntity } from '../../domain/entities/customization';
import { CustomizationForbiddenError } from '../../domain/errors';
import { CustomizationInUseError } from '../../domain/errors';

/**
 * T08 RED — Use case tests for Create/Update/Delete Customization.
 *
 * Uses a Fake CustomizationRepository (no Prisma, no DB).
 */

// --- Fake Repository ---

class FakeCustomizationRepository implements CustomizationRepository {
  private store = new Map<string, CustomizationEntity>();
  public orderReferences = new Set<string>();

  async save(entity: CustomizationEntity): Promise<CustomizationEntity> {
    this.store.set(entity.id, { ...entity });
    return { ...entity };
  }

  async findById(id: string): Promise<CustomizationEntity | null> {
    return this.store.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<CustomizationEntity[]> {
    return ids
      .map((id) => this.store.get(id))
      .filter((e): e is CustomizationEntity => e !== undefined);
  }

  async findByProductId(productId: string): Promise<CustomizationEntity[]> {
    return [...this.store.values()].filter((e) => e.productId === productId);
  }

  async findBySellerId(sellerId: string): Promise<CustomizationEntity[]> {
    return [...this.store.values()].filter((e) => e.sellerId === sellerId);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async isReferencedByOrders(id: string): Promise<boolean> {
    return this.orderReferences.has(id);
  }
}

// --- Tests ---

describe('CreateCustomization', () => {
  let repo: FakeCustomizationRepository;
  let useCase: CreateCustomization;

  beforeEach(() => {
    repo = new FakeCustomizationRepository();
    useCase = new CreateCustomization(repo);
  });

  it('should create with all fields', async () => {
    const result = await useCase.execute({
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: 'https://x.com/y.png',
    });

    expect(result.sellerId).toBe('seller-1');
    expect(result.productId).toBe('prod-1');
    expect(result.text).toBe('Hello');
    expect(result.color).toBe('red');
    expect(result.size).toBe('M');
    expect(result.imageUrl).toBe('https://x.com/y.png');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should create with no optional fields', async () => {
    const result = await useCase.execute({
      sellerId: 'seller-1',
      productId: 'prod-1',
    });

    expect(result.text).toBeNull();
    expect(result.color).toBeNull();
    expect(result.size).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it('should reject text > 500 chars', async () => {
    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        productId: 'prod-1',
        text: 'a'.repeat(501),
      }),
    ).rejects.toThrow();
  });

  it('should reject blank color', async () => {
    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        productId: 'prod-1',
        color: '  ',
      }),
    ).rejects.toThrow();
  });

  it('should reject invalid imageUrl', async () => {
    await expect(
      useCase.execute({
        sellerId: 'seller-1',
        productId: 'prod-1',
        imageUrl: 'ftp://x.com/y.png',
      }),
    ).rejects.toThrow();
  });

  it('should persist the entity in the repository', async () => {
    const result = await useCase.execute({
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'Test',
    });

    const found = await repo.findById(result.id);
    expect(found).not.toBeNull();
    expect(found!.text).toBe('Test');
  });
});

describe('UpdateCustomization', () => {
  let repo: FakeCustomizationRepository;
  let useCase: UpdateCustomization;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    useCase = new UpdateCustomization(repo);

    // Seed a customization
    await repo.save({
      id: 'cust-1',
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'Original',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date(),
    });
  });

  it('should update by owner', async () => {
    const result = await useCase.execute({
      id: 'cust-1',
      sellerId: 'seller-1',
      text: 'Updated',
    });

    expect(result.text).toBe('Updated');
    expect(result.sellerId).toBe('seller-1'); // unchanged
  });

  it('should reject update by non-owner', async () => {
    await expect(
      useCase.execute({
        id: 'cust-1',
        sellerId: 'seller-OTHER',
        text: 'Hacked',
      }),
    ).rejects.toThrow(CustomizationForbiddenError);

    // Verify no DB write
    const found = await repo.findById('cust-1');
    expect(found!.text).toBe('Original');
  });

  it('should reject update of non-existent customization', async () => {
    await expect(
      useCase.execute({
        id: 'non-existent',
        sellerId: 'seller-1',
        text: 'Nope',
      }),
    ).rejects.toThrow();
  });

  it('should re-validate fields on update', async () => {
    await expect(
      useCase.execute({
        id: 'cust-1',
        sellerId: 'seller-1',
        text: 'a'.repeat(501),
      }),
    ).rejects.toThrow();
  });

  it('should update only provided fields', async () => {
    const result = await useCase.execute({
      id: 'cust-1',
      sellerId: 'seller-1',
      color: 'blue',
    });

    expect(result.color).toBe('blue');
    expect(result.text).toBe('Original'); // unchanged
    expect(result.size).toBe('M'); // unchanged
  });
});

describe('DeleteCustomization', () => {
  let repo: FakeCustomizationRepository;
  let useCase: DeleteCustomization;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    useCase = new DeleteCustomization(repo);

    await repo.save({
      id: 'cust-1',
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'To delete',
      color: null,
      size: null,
      imageUrl: null,
      createdAt: new Date(),
    });
  });

  it('should delete when not referenced by orders', async () => {
    await useCase.execute({ id: 'cust-1' });

    const found = await repo.findById('cust-1');
    expect(found).toBeNull();
  });

  it('should reject delete when referenced by orders', async () => {
    repo.orderReferences.add('cust-1');

    await expect(useCase.execute({ id: 'cust-1' })).rejects.toThrow(
      CustomizationInUseError,
    );

    // Verify row preserved
    const found = await repo.findById('cust-1');
    expect(found).not.toBeNull();
  });

  it('should reject delete of non-existent customization', async () => {
    await expect(useCase.execute({ id: 'non-existent' })).rejects.toThrow();
  });
});
