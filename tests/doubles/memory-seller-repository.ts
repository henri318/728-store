import type { SellerEntity } from '@/modules/sellers/domain/seller';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { SellerStatus } from '@/modules/sellers/domain/seller-status';

/**
 * In-memory SellerRepository test double.
 *
 * Implements the production `SellerRepository` port but stores sellers in a
 * plain array. Test cases inspect the internal state to assert expected
 * domain behavior.
 */
export class MemorySellerRepository implements SellerRepository {
  private sellers: SellerEntity[] = [];

  /** Seed a seller directly (bypassing save). Useful for test setup. */
  seed(seller: SellerEntity): void {
    this.sellers.push(seller);
  }

  async save(seller: SellerEntity, _tx?: unknown): Promise<SellerEntity> {
    this.sellers.push(seller);
    return seller;
  }

  async findById(id: string): Promise<SellerEntity | null> {
    return (
      this.sellers.find(
        (s) => s.sellerId.value === id && s.deletedAt === null,
      ) ?? null
    );
  }

  async findByName(name: string): Promise<SellerEntity | null> {
    const lower = name.trim().toLowerCase();
    return (
      this.sellers.find(
        (s) => s.name.toLowerCase() === lower && s.deletedAt === null,
      ) ?? null
    );
  }

  async findAll(): Promise<SellerEntity[]> {
    return this.sellers.filter((s) => s.deletedAt === null);
  }

  async findAllByStatus(status: SellerStatus): Promise<SellerEntity[]> {
    return this.sellers.filter(
      (s) => s.status === status && s.deletedAt === null,
    );
  }

  async update(seller: SellerEntity, _tx?: unknown): Promise<SellerEntity> {
    const index = this.sellers.findIndex(
      (s) => s.sellerId.value === seller.sellerId.value,
    );
    if (index < 0) {
      throw new Error(`Seller with id ${seller.sellerId.value} not found`);
    }
    this.sellers[index] = seller;
    return seller;
  }

  async softDelete(id: string): Promise<void> {
    const seller = this.sellers.find((s) => s.sellerId.value === id);
    if (seller) {
      Object.assign(seller, { deletedAt: new Date() });
    }
  }

  async findByUserId(userId: string): Promise<SellerEntity | null> {
    return (
      this.sellers.find((s) => s.userId === userId && s.deletedAt === null) ??
      null
    );
  }
}
