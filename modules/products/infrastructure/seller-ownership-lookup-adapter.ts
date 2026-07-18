import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { SellerOwnershipLookupPort } from '../domain/seller-ownership-lookup-port';

export class SellerOwnershipLookupAdapter implements SellerOwnershipLookupPort {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async findSellerIdByUserId(userId: string): Promise<string | null> {
    const seller = await this.sellerRepository.findByUserId(userId);
    return seller?.sellerId.value ?? null;
  }
}
