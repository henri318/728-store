import type {
  SellerLookupPort,
  SellerLookupSnapshot,
} from '@/modules/orders/domain/seller-lookup-port';

export class MemorySellerLookup implements SellerLookupPort {
  private sellers = new Map<string, SellerLookupSnapshot>();

  async findByUserId(userId: string): Promise<SellerLookupSnapshot | null> {
    return this.sellers.get(userId) ?? null;
  }

  seed(snapshot: SellerLookupSnapshot & { userId: string }): void {
    this.sellers.set(snapshot.userId, { sellerId: snapshot.sellerId });
  }

  clear(): void {
    this.sellers.clear();
  }
}
