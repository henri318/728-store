import { describe, it, expect } from 'vitest';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Task 1.5 — SellerEvents and GlobalEvents integration.
 *
 * Tests verify:
 * - SellerEvents object has all 4 event constants
 * - Event string values follow the module.event naming convention
 * - All seller events are registered in GlobalEvents
 */
describe('SellerEvents', () => {
  it('should define SELLER_CREATED event', () => {
    expect(SellerEvents.SELLER_CREATED).toBe('seller.created');
  });

  it('should define SELLER_UPDATED event', () => {
    expect(SellerEvents.SELLER_UPDATED).toBe('seller.updated');
  });

  it('should define SELLER_DELETED event', () => {
    expect(SellerEvents.SELLER_DELETED).toBe('seller.deleted');
  });

  it('should define SELLER_STATUS_CHANGED event', () => {
    expect(SellerEvents.SELLER_STATUS_CHANGED).toBe('seller.status-changed');
  });

  it('should have exactly 4 events', () => {
    const keys = Object.keys(SellerEvents);
    expect(keys).toHaveLength(4);
  });
});

describe('GlobalEvents — seller events registered', () => {
  it('should include SELLER_CREATED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('SELLER_CREATED');
    expect(GlobalEvents.SELLER_CREATED).toBe('seller.created');
  });

  it('should include SELLER_UPDATED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('SELLER_UPDATED');
    expect(GlobalEvents.SELLER_UPDATED).toBe('seller.updated');
  });

  it('should include SELLER_DELETED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('SELLER_DELETED');
    expect(GlobalEvents.SELLER_DELETED).toBe('seller.deleted');
  });

  it('should include SELLER_STATUS_CHANGED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('SELLER_STATUS_CHANGED');
    expect(GlobalEvents.SELLER_STATUS_CHANGED).toBe('seller.status-changed');
  });

  it('should have seller events matching SellerEvents values', () => {
    expect(GlobalEvents.SELLER_CREATED).toBe(SellerEvents.SELLER_CREATED);
    expect(GlobalEvents.SELLER_UPDATED).toBe(SellerEvents.SELLER_UPDATED);
    expect(GlobalEvents.SELLER_DELETED).toBe(SellerEvents.SELLER_DELETED);
    expect(GlobalEvents.SELLER_STATUS_CHANGED).toBe(
      SellerEvents.SELLER_STATUS_CHANGED,
    );
  });
});
