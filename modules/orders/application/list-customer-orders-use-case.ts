import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type {
  OrderEntity,
  OrderListFilter,
  OrderRepository,
} from '../domain/order-repository';

export interface ListCustomerOrdersDTO extends Omit<OrderListFilter, 'userId'> {
  userId: string;
}

export class ListCustomerOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    dto: ListCustomerOrdersDTO,
    locale?: string,
  ): Promise<PaginatedResult<OrderEntity>> {
    const { userId, ...filter } = dto;
    return this.orderRepository.findPaginated(
      {
        ...filter,
        userId,
      },
      locale,
    );
  }
}
