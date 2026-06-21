import type { SellerEntity } from './seller';

/**
 * SellerRepository — the port for persisting and querying sellers.
 *
 * Production implementation: PrismaSellerRepository (in infrastructure layer).
 * Test implementation:      MemorySellerRepository (in tests/doubles).
 *
 * Following the existing UserRepository pattern: all methods return
 * domain entities, never persistence models. The adapter layer handles
 * mapping between the two.
 */
export interface SellerRepository {
  /** Persist a new seller. Returns the created entity with generated fields. */
  save(seller: SellerEntity): Promise<SellerEntity>;

  /** Find a seller by its unique ID. Returns null if not found. */
  findById(id: string): Promise<SellerEntity | null>;

  /** Find a seller by its unique name. Returns null if not found. */
  findByName(name: string): Promise<SellerEntity | null>;

  /** Return all non-deleted sellers. */
  findAll(): Promise<SellerEntity[]>;

  /** Update an existing seller. Returns the updated entity. */
  update(seller: SellerEntity): Promise<SellerEntity>;

  /** Soft-delete a seller by setting deletedAt. */
  softDelete(id: string): Promise<void>;

  /** Find a seller linked to a specific user. Returns null if not linked. */
  findByUserId(userId: string): Promise<SellerEntity | null>;
}
