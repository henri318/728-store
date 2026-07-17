import { NotFoundError } from '@/shared/kernel/app-error';
import type { OrderEntity, OrderRepository } from '../domain/order-repository';

export class GetCustomerOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    orderId: string,
    userId: string,
    locale?: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepository.findById(orderId, locale);
    if (!order || order.userId !== userId) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }
}
