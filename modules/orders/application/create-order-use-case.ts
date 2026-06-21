import {
  OrderRepository,
  OrderEntity,
  OrderLineItemEntity,
} from '../domain/order-repository';
import { ProductRepository } from '../domain/product-repository';
import { ProductSnapshot } from '../domain/product-snapshot';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { NotFoundError } from '@/shared/kernel/app-error';

// --- Data Transfer Objects ---

export interface CustomizationInput {
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

export interface OrderLineItemInput {
  productId: string;
  quantity: number;
  customization: CustomizationInput;
}

export interface CreateOrderDTO {
  userId: string;
  items: OrderLineItemInput[];
}

// Re-export domain types for back-compat with existing consumers (tests).
export type {
  OrderEntity,
  OrderLineItemEntity,
} from '../domain/order-repository';

// --- Use Case ---

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: CreateOrderDTO) {
    let totalOrderPrice = 0;
    const orderLineItemsToSave: OrderLineItemEntity[] = [];
    const productsMap = new Map<string, ProductSnapshot>(); // To avoid multiple fetches for same product

    // Fetch all unique products and their customization options if available
    const productIds = dto.items.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];

    for (const productId of uniqueProductIds) {
      const product = await this.productRepository.findById(productId, 'es'); // Using 'es' locale for fetching price
      if (!product) {
        throw new NotFoundError(
          `Product with ID ${productId} not found.`,
          `Product with ID ${productId} not found.`,
        );
      }
      // Store in map for quick lookup
      productsMap.set(productId, product);
    }

    // Process each item to create line items and calculate total price
    for (const item of dto.items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        // This should ideally not happen if previous step was successful
        throw new NotFoundError(`Product with ID ${item.productId} not found.`);
      }

      // Base price for the item (considering quantity)
      const itemTotalPrice = product.basePrice * item.quantity;

      // Add customization cost - for now, assuming no extra cost for customization
      // In a real app, customization might have its own price or logic that would be added here.
      // For example: if (item.customization.price) { itemTotalPrice += item.customization.price; }

      totalOrderPrice += itemTotalPrice;

      orderLineItemsToSave.push({
        id: crypto.randomUUID(), // Generate temp ID for line item
        orderId: '', // This will be set when the order is saved and line items are linked
        productId: item.productId,
        quantity: item.quantity,
        customizationText: item.customization.text,
        customizationColor: item.customization.color,
        customizationSize: item.customization.size,
        customizationImageUrl: item.customization.imageUrl, // Placeholder: Actual image upload logic needed.
      });
    }

    // 2. Create the Order
    const newOrder: OrderEntity = {
      id: crypto.randomUUID(),
      userId: dto.userId,
      // --- Multi-Seller Order Assumption ---
      // The sellerId for the order is currently determined by the first product in the items list.
      // This assumes all items in a single order come from the same seller.
      // For orders with items from multiple sellers, a different order creation strategy (e.g., multiple orders per seller) would be required.
      sellerId:
        dto.items.length > 0
          ? (productsMap.get(dto.items[0].productId)?.sellerId ?? '')
          : '',
      total: totalOrderPrice,
      status: 'pending',
      lineItems: [], // This will be populated after order is saved and line items are linked
    };

    const savedOrder = await this.orderRepository.save(newOrder);

    // Update line items with the saved orderId and save them
    const lineItemsWithOrderId = orderLineItemsToSave.map((lineItem) => ({
      ...lineItem,
      orderId: savedOrder.id,
    }));

    // --- Order Line Item Persistence ---
    // The current implementation assumes the repository's save method can handle saving line items.
    // If not, we'd need a separate method or logic for saving line items.
    // We have added a saveOrderLineItems method to MemoryOrderRepository for demonstration.
    // Ensure your primary repository implementation (e.g., PrismaOrderRepository) also supports this.
    await this.orderRepository.saveOrderLineItems(
      savedOrder.id,
      lineItemsWithOrderId,
    );

    // 3. Record event in Outbox
    await this.outboxRepository.saveEvent(GlobalEvents.ORDER_CREATED, {
      orderId: savedOrder.id,
      userId: savedOrder.userId,
      sellerId: savedOrder.sellerId,
      totalAmount: Number(savedOrder.total),
    });

    return savedOrder;
  }
}
