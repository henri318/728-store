import type { CustomizationEntity } from './entities/customization';

/**
 * CustomizationRepository — port for customization persistence.
 *
 * The Prisma adapter is the only implementation. No business logic
 * lives in the adapter.
 */
export interface CustomizationRepository {
  save(entity: CustomizationEntity): Promise<CustomizationEntity>;
  findById(id: string): Promise<CustomizationEntity | null>;
  /**
   * Returns only the IDs that exist. Missing IDs are silently absent
   * from the result (spec REQ-CUST-02).
   */
  findByIds(ids: string[]): Promise<CustomizationEntity[]>;
  findByProductId(productId: string): Promise<CustomizationEntity[]>;
  /** Admin scope — returns all customizations for a seller. */
  findBySellerId(sellerId: string): Promise<CustomizationEntity[]>;
  delete(id: string): Promise<void>;
  /**
   * Returns true if the customization is referenced by any
   * OrderLineItem.customizationIdList (spec REQ-CUST-03).
   */
  isReferencedByOrders(id: string): Promise<boolean>;
}
