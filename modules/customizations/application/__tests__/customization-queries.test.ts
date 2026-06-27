import { describe, it, expect, beforeEach } from 'vitest';
import { GetCustomizationById } from '../get-customization-by-id';
import { GetCustomizationByIds } from '../get-customization-by-ids';
import type { CustomizationRepository } from '../../domain/customization-repository';
import type { CustomizationEntity } from '../../domain/entities/customization';

/**
 * T09-T10 RED — Use case tests for GetById and GetByIds.
 *
 * Uses a Fake CustomizationRepository.
 */

// --- Fake Repository ---

class FakeCustomizationRepository implements CustomizationRepository {
  private store = new Map<string, CustomizationEntity>();

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

  async isReferencedByOrders(_id: string): Promise<boolean> {
    return false;
  }
}

// --- Tests ---

describe('GetCustomizationById', () => {
  let repo: FakeCustomizationRepository;
  let useCase: GetCustomizationById;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    useCase = new GetCustomizationById(repo);

    await repo.save({
      id: 'cust-1',
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'Hello',
      color: 'red',
      size: 'M',
      imageUrl: null,
      createdAt: new Date(),
    });
  });

  it('should return entity when found', async () => {
    const result = await useCase.execute({ id: 'cust-1' });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('cust-1');
    expect(result!.text).toBe('Hello');
  });

  it('should return null when not found', async () => {
    const result = await useCase.execute({ id: 'non-existent' });
    expect(result).toBeNull();
  });
});

describe('GetCustomizationByIds', () => {
  let repo: FakeCustomizationRepository;
  let useCase: GetCustomizationByIds;

  beforeEach(async () => {
    repo = new FakeCustomizationRepository();
    useCase = new GetCustomizationByIds(repo);

    await repo.save({
      id: 'C1',
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: 'Hi',
      color: 'red',
      size: null,
      imageUrl: null,
      createdAt: new Date(),
    });
    await repo.save({
      id: 'C2',
      sellerId: 'seller-1',
      productId: 'prod-1',
      text: null,
      color: null,
      size: 'L',
      imageUrl: null,
      createdAt: new Date(),
    });
    await repo.save({
      id: 'C3',
      sellerId: 'seller-2',
      productId: 'prod-2',
      text: 'Bye',
      color: null,
      size: null,
      imageUrl: null,
      createdAt: new Date(),
    });
  });

  it('should return Map keyed by id', async () => {
    const result = await useCase.execute({ ids: ['C1', 'C2'] });
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get('C1')!.text).toBe('Hi');
    expect(result.get('C2')!.size).toBe('L');
  });

  it('should return partial results for missing IDs', async () => {
    const result = await useCase.execute({ ids: ['C1', 'GHOST', 'C3'] });
    expect(result.size).toBe(2);
    expect(result.has('C1')).toBe(true);
    expect(result.has('C3')).toBe(true);
    expect(result.has('GHOST')).toBe(false);
  });

  it('should return empty Map for all missing IDs', async () => {
    const result = await useCase.execute({ ids: ['GHOST1', 'GHOST2'] });
    expect(result.size).toBe(0);
  });

  it('should return empty Map for empty input', async () => {
    const result = await useCase.execute({ ids: [] });
    expect(result.size).toBe(0);
  });
});
