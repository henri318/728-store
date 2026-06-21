import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { SellerStatus } from '@/modules/sellers/domain/seller-status';

export interface ListSellersDTO {
  status?: SellerStatus;
}

export class ListSellersUseCase {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async execute(dto: ListSellersDTO) {
    const sellers = await this.sellerRepository.findAll();

    if (dto.status) {
      return sellers.filter((s) => s.status === dto.status);
    }

    return sellers;
  }
}
