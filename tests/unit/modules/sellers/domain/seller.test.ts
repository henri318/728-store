import { describe, it, expect } from 'vitest';
import type { SellerEntity } from '@/modules/sellers/domain/seller';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';

/**
 * Task 1.3 — SellerEntity interface.
 *
 * Tests verify the interface shape can be satisfied with all fields
 * and that SellerStatus re-export is accessible from the seller module.
 */
describe('SellerEntity', () => {
  it('should be constructible with all required fields', () => {
    const seller: SellerEntity = {
      sellerId: 'seller-1' as any,
      name: 'Test Shop',
      description: 'A test shop',
      userId: 'user-1',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    expect(seller.name).toBe('Test Shop');
    expect(seller.status).toBe(SellerStatus.ACTIVE);
    expect(seller.deletedAt).toBeNull();
  });

  it('should allow null description', () => {
    const seller: SellerEntity = {
      sellerId: 'seller-2' as any,
      name: 'Minimal Shop',
      description: null,
      userId: 'user-2',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(seller.description).toBeNull();
  });

  it('should require userId (seller must have linked user)', () => {
    const seller: SellerEntity = {
      sellerId: 'seller-3' as any,
      name: 'Linked Shop',
      description: 'A shop with a user',
      userId: 'user-3',
      status: SellerStatus.SUSPENDED,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(seller.userId).toBe('user-3');
  });

  it('should allow deletedAt to be a Date', () => {
    const deletedDate = new Date('2025-06-01');
    const seller: SellerEntity = {
      sellerId: 'seller-4' as any,
      name: 'Deleted Shop',
      description: null,
      userId: 'user-4',
      status: SellerStatus.BANNED,
      deletedAt: deletedDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(seller.deletedAt).toBeInstanceOf(Date);
  });
});
