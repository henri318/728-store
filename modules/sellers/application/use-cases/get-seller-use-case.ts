import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import { NotFoundError } from '@/shared/kernel/app-error';

export interface GetSellerDTO {
  sellerId: string;
}

export class GetSellerUseCase {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async execute(dto: GetSellerDTO) {
    const seller = await this.sellerRepository.findById(dto.sellerId);
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    return seller;
  }
}
