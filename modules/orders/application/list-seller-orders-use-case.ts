import { NotFoundError } from '@/shared/kernel/app-error';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type { SellerLookupPort } from '../domain/seller-lookup-port';
import type {
  OrderEntity,
  OrderListFilter,
  OrderRepository,
} from '../domain/order-repository';

export interface ListSellerOrdersDTO extends Omit<OrderListFilter, 'sellerId'> {
  userId: string;
}

export class ListSellerOrdersUseCase {
  constructor(
    private readonly sellerLookup: SellerLookupPort,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(
    dto: ListSellerOrdersDTO,
    locale?: string,
  ): Promise<PaginatedResult<OrderEntity>> {
    const seller = await this.sellerLookup.findByUserId(dto.userId);
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    const { userId: _userId, ...filter } = dto;
    return this.orderRepository.findPaginated(
      {
        ...filter,
        sellerId: seller.sellerId,
      },
      locale,
    );
  }
}
