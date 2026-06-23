import { describe, it, expect } from 'vitest';
import {
  ProductStatus,
  VALID_TRANSITIONS,
} from '@/modules/products/domain/value-objects/product-status';

describe('ProductStatus', () => {
  it('should define the three valid status values', () => {
    expect(ProductStatus.DRAFT).toBe('DRAFT');
    expect(ProductStatus.ACTIVE).toBe('ACTIVE');
    expect(ProductStatus.ARCHIVED).toBe('ARCHIVED');
  });

  it('should have exactly 3 members', () => {
    const keys = Object.values(ProductStatus);
    expect(keys).toHaveLength(3);
  });
});

describe('VALID_TRANSITIONS', () => {
  it('should allow DRAFT → ACTIVE', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).toContain(
      ProductStatus.ACTIVE,
    );
  });

  it('should allow ACTIVE → ARCHIVED', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ACTIVE]).toContain(
      ProductStatus.ARCHIVED,
    );
  });

  it('should NOT allow DRAFT → ARCHIVED (must go through ACTIVE)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).not.toContain(
      ProductStatus.ARCHIVED,
    );
  });

  it('should NOT allow ARCHIVED → any status (terminal state)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ARCHIVED]).toBeUndefined();
  });

  it('should define transitions for exactly 2 statuses (DRAFT, ACTIVE)', () => {
    const transitionKeys = Object.keys(VALID_TRANSITIONS);
    expect(transitionKeys).toHaveLength(2);
    expect(transitionKeys).toContain(ProductStatus.DRAFT);
    expect(transitionKeys).toContain(ProductStatus.ACTIVE);
  });

  it('should NOT include same-status in transitions (no-op handled by use case)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).not.toContain(
      ProductStatus.DRAFT,
    );
    expect(VALID_TRANSITIONS[ProductStatus.ACTIVE]).not.toContain(
      ProductStatus.ACTIVE,
    );
  });
});

describe('canTransitionTo()', () => {
  it('should return true for valid transition DRAFT → ACTIVE', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.ACTIVE)).toBe(
      true,
    );
  });

  it('should return true for valid transition ACTIVE → ARCHIVED', () => {
    expect(canTransitionTo(ProductStatus.ACTIVE, ProductStatus.ARCHIVED)).toBe(
      true,
    );
  });

  it('should return false for invalid transition DRAFT → ARCHIVED', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.ARCHIVED)).toBe(
      false,
    );
  });

  it('should return false for ARCHIVED → any (terminal)', () => {
    expect(canTransitionTo(ProductStatus.ARCHIVED, ProductStatus.ACTIVE)).toBe(
      false,
    );
    expect(canTransitionTo(ProductStatus.ARCHIVED, ProductStatus.DRAFT)).toBe(
      false,
    );
  });
});

/**
 * Helper function that validates a status transition.
 * This tests the transition logic that will be used in the domain layer.
 */
function canTransitionTo(from: ProductStatus, to: ProductStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
