import { NotFoundError } from '@/shared/kernel/app-error';
import type { OrderEntity, OrderRepository } from '../domain/order-repository';
import type { CustomerNameLookupPort } from '../domain/customer-name-lookup-port';
import type { SellerLookupPort } from '../domain/seller-lookup-port';

export interface GetSellerOrderResult {
  order: OrderEntity;
  customerName: string | null;
  customerEmail: string | null;
}

export class GetSellerOrderUseCase {
  constructor(
    private readonly sellerLookup: SellerLookupPort,
    private readonly orderRepository: OrderRepository,
    private readonly customerNameLookup: CustomerNameLookupPort,
  ) {}

  async execute(
    orderId: string,
    userId: string,
    locale?: string,
  ): Promise<GetSellerOrderResult> {
    const seller = await this.sellerLookup.findByUserId(userId);
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    const order = await this.orderRepository.findById(orderId, locale);
    if (!order || order.sellerId !== seller.sellerId) {
      throw new NotFoundError('Order not found');
    }

    const user = await this.customerNameLookup.findById(order.userId);
    const customerName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : null;
    const customerEmail = user?.email ?? null;

    return { order, customerName, customerEmail };
  }
}
