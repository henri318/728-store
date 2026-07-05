import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type {
  SellerLookupPort,
  SellerLookupSnapshot,
} from '../domain/seller-lookup-port';

export class SellerLookupAdapter implements SellerLookupPort {
  constructor(private readonly delegate: SellerRepository) {}

  async findByUserId(userId: string): Promise<SellerLookupSnapshot | null> {
    const seller = await this.delegate.findByUserId(userId);
    if (!seller) return null;
    return { sellerId: seller.sellerId.value };
  }
}
