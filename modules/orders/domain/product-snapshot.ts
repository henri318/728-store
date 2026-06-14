/**
 * ProductSnapshot — minimal product data needed by the orders module.
 *
 * Orders never import from the products module directly. This value object
 * is what the orders domain needs from a product to create an order:
 * the id, the base price, and the seller who fulfils the order.
 *
 * The orders module defines its own port (`ProductRepository`) that returns
 * this snapshot. The actual data is fetched through an adapter in
 * `orders/infrastructure` that delegates to the products infrastructure —
 * orders never knows the product data model beyond these three fields.
 */
export interface ProductSnapshot {
  id: string;
  basePrice: number;
  sellerId: string;
}
