import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { SellerStatus } from '@/modules/sellers/domain/seller-status';

export interface ListSellersDTO {
  status?: SellerStatus;
}

export class ListSellersUseCase {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async execute(dto: ListSellersDTO) {
    if (dto.status) {
      return this.sellerRepository.findAllByStatus(dto.status);
    }
    return this.sellerRepository.findAll();
  }
}
