/**
 * ProductSnapshot — minimal product view that the cart module needs.
 *
 * The cart module never imports from the products module directly. The
 * composition root wires a `ProductRepository` adapter (same pattern as
 * orders) that resolves product ids into these snapshots at runtime.
 */
export interface ProductSnapshot {
  id: string;
  basePrice: number;
  sellerId: string;
}
