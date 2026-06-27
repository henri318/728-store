import { describe, it, expect, beforeEach } from 'vitest';
import { CreateCustomization } from '../create-customization';
import type { ProductExistsPort } from '../create-customization';
import { UpdateCustomization } from '../update-customization';
import type { ProductOwnershipPort } from '../update-customization';
import { DeleteCustomization } from '../delete-customization';
import type { ProductOwnershipPort as DeleteOwnershipPort } from '../delete-customization';
import type { CustomizationRepository } from '../../domain/customization-repository';
import type { CustomizationEntity } from '../../domain/entities/customization';
import { CustomizationForbiddenError } from '../../domain/errors';
import { CustomizationInUseError } from '../../domain/errors';

/**
 * T08 RED — Use case tests for Create/Update/Delete Customization.
 *
 * Uses a Fake CustomizationRepository and fake port implementations.
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

  async findBySellerId(_sellerId: string): Promise<CustomizationEntity[]> {
    return [];
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async isReferencedByOrders(id: string): Promise<boolean> {
    return this.orderReferences.has(id);
  }
}

// --- Fake Ports ---

class FakeProductExistsPort implements ProductExistsPort {
  public existingProductIds = new Set<string>(['prod-1', 'prod-2']);

  async exists(productId: string): Promise<boolean> {
    return this.existingProductIds.has(productId);
  }
}

class FakeProductOwnershipPort
  implements ProductOwnershipPort, DeleteOwnershipPort
{
  public ownershipMap = new Map<string, string>(); // customizationId → sellerId

  async getSellerIdForCustomization(
    customizationId: string,
  ): Promise<string | null> {
    return this.ownershipMap.get(customizationId) ?? null;
  }
}

// --- Tests ---

describe('CreateCustomization', () => {
  let repo: FakeCustomizationRepository;
  let productExists: FakeProductExistsPort;
  let useCase: CreateCustomization;

  beforeEach(() => {
    repo = new FakeCustomizationRepository();
    productExists = new FakeProductExistsPort();
    useCase = new CreateCustomization(repo, productExists);
  });

  it('should create with all fields', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: 'https://x.com/y.png',
    });

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
        productId: 'prod-1',
        text: 'a'.repeat(501),
      }),
    ).rejects.toThrow();
  });

  it('should reject blank color', async () => {
    await expect(
      useCase.execute({
        productId: 'prod-1',
        color: '  ',
      }),
    ).rejects.toThrow();
  });

  it('should reject invalid imageUrl', async () => {
    await expect(
      useCase.execute({
        productId: 'prod-1',
        imageUrl: 'ftp://x.com/y.png',
      }),
    ).rejects.toThrow();
  });

  it('should persist the entity in the repository', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      text: 'Test',
    });

    const found = await repo.findById(result.id);
    expect(found).not.toBeNull();
    expect(found!.text).toBe('Test');
  });

  it('should reject when product does not exist', async () => {
    await expect(
      useCase.execute({
        productId: 'non-existent-product',
        text: 'Test',
      }),
    ).rejects.toThrow();
  });
});

describe('UpdateCustomization', () => {
  let repo: FakeCustomizationRepository;
  let productOwnership: FakeProductOwnershipPort;
  let useCase: UpdateCustomization;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    productOwnership = new FakeProductOwnershipPort();
    useCase = new UpdateCustomization(repo, productOwnership);

    // Seed a customization
    await repo.save({
      id: 'cust-1',
      productId: 'prod-1',
      text: 'Original',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date(),
    });

    // Set ownership: cust-1 belongs to seller-1 via product
    productOwnership.ownershipMap.set('cust-1', 'seller-1');
  });

  it('should update by owner', async () => {
    const result = await useCase.execute({
      id: 'cust-1',
      sellerId: 'seller-1',
      text: 'Updated',
    });

    expect(result.text).toBe('Updated');
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
  let productOwnership: FakeProductOwnershipPort;
  let useCase: DeleteCustomization;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    productOwnership = new FakeProductOwnershipPort();
    useCase = new DeleteCustomization(repo, productOwnership);

    await repo.save({
      id: 'cust-1',
      productId: 'prod-1',
      text: 'To delete',
      color: null,
      size: null,
      imageUrl: null,
      createdAt: new Date(),
    });

    // Set ownership: cust-1 belongs to seller-1 via product
    productOwnership.ownershipMap.set('cust-1', 'seller-1');
  });

  it('should delete when not referenced by orders', async () => {
    await useCase.execute({ id: 'cust-1', sellerId: 'seller-1' });

    const found = await repo.findById('cust-1');
    expect(found).toBeNull();
  });

  it('should reject delete by non-owner', async () => {
    await expect(
      useCase.execute({ id: 'cust-1', sellerId: 'seller-OTHER' }),
    ).rejects.toThrow(CustomizationForbiddenError);

    // Verify row preserved
    const found = await repo.findById('cust-1');
    expect(found).not.toBeNull();
  });

  it('should reject delete when referenced by orders', async () => {
    repo.orderReferences.add('cust-1');

    await expect(
      useCase.execute({ id: 'cust-1', sellerId: 'seller-1' }),
    ).rejects.toThrow(CustomizationInUseError);

    // Verify row preserved
    const found = await repo.findById('cust-1');
    expect(found).not.toBeNull();
  });

  it('should reject delete of non-existent customization', async () => {
    await expect(
      useCase.execute({ id: 'non-existent', sellerId: 'seller-1' }),
    ).rejects.toThrow();
  });
});
