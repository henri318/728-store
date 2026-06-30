import { describe, it, expect } from 'vitest';
import {
  ProductStatus,
  VALID_TRANSITIONS,
} from '@/modules/products/domain/value-objects/product-status';

describe('ProductStatus', () => {
  it('should define the four valid status values', () => {
    expect(ProductStatus.DRAFT).toBe('DRAFT');
    expect(ProductStatus.ACTIVE).toBe('ACTIVE');
    expect(ProductStatus.ARCHIVED).toBe('ARCHIVED');
    expect(ProductStatus.ELIMINATED).toBe('ELIMINATED');
  });

  it('should have exactly 4 members', () => {
    const keys = Object.values(ProductStatus);
    expect(keys).toHaveLength(4);
  });
});

describe('VALID_TRANSITIONS', () => {
  it('should allow DRAFT → ACTIVE', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).toContain(
      ProductStatus.ACTIVE,
    );
  });

  it('should allow DRAFT → ELIMINATED', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).toContain(
      ProductStatus.ELIMINATED,
    );
  });

  it('should allow ACTIVE → ARCHIVED', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ACTIVE]).toContain(
      ProductStatus.ARCHIVED,
    );
  });

  it('should allow ACTIVE → ELIMINATED', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ACTIVE]).toContain(
      ProductStatus.ELIMINATED,
    );
  });

  it('should allow ARCHIVED → ACTIVE', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ARCHIVED]).toContain(
      ProductStatus.ACTIVE,
    );
  });

  it('should allow ARCHIVED → ELIMINATED', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ARCHIVED]).toContain(
      ProductStatus.ELIMINATED,
    );
  });

  it('should NOT allow DRAFT → ARCHIVED (must go through ACTIVE)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).not.toContain(
      ProductStatus.ARCHIVED,
    );
  });

  it('should NOT allow ELIMINATED → any status (terminal state)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.ELIMINATED]).toBeUndefined();
  });

  it('should define transitions for exactly 3 statuses (DRAFT, ACTIVE, ARCHIVED)', () => {
    const transitionKeys = Object.keys(VALID_TRANSITIONS);
    expect(transitionKeys).toHaveLength(3);
    expect(transitionKeys).toContain(ProductStatus.DRAFT);
    expect(transitionKeys).toContain(ProductStatus.ACTIVE);
    expect(transitionKeys).toContain(ProductStatus.ARCHIVED);
  });

  it('should NOT include same-status in transitions (no-op handled by use case)', () => {
    expect(VALID_TRANSITIONS[ProductStatus.DRAFT]).not.toContain(
      ProductStatus.DRAFT,
    );
    expect(VALID_TRANSITIONS[ProductStatus.ACTIVE]).not.toContain(
      ProductStatus.ACTIVE,
    );
    expect(VALID_TRANSITIONS[ProductStatus.ARCHIVED]).not.toContain(
      ProductStatus.ARCHIVED,
    );
  });
});

describe('canTransitionTo()', () => {
  it('should return true for valid transition DRAFT → ACTIVE', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.ACTIVE)).toBe(
      true,
    );
  });

  it('should return true for valid transition DRAFT → ELIMINATED', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.ELIMINATED)).toBe(
      true,
    );
  });

  it('should return true for valid transition ACTIVE → ARCHIVED', () => {
    expect(canTransitionTo(ProductStatus.ACTIVE, ProductStatus.ARCHIVED)).toBe(
      true,
    );
  });

  it('should return true for valid transition ACTIVE → ELIMINATED', () => {
    expect(
      canTransitionTo(ProductStatus.ACTIVE, ProductStatus.ELIMINATED),
    ).toBe(true);
  });

  it('should return true for valid transition ARCHIVED → ACTIVE', () => {
    expect(canTransitionTo(ProductStatus.ARCHIVED, ProductStatus.ACTIVE)).toBe(
      true,
    );
  });

  it('should return true for valid transition ARCHIVED → ELIMINATED', () => {
    expect(
      canTransitionTo(ProductStatus.ARCHIVED, ProductStatus.ELIMINATED),
    ).toBe(true);
  });

  it('should return false for invalid transition DRAFT → ARCHIVED', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.ARCHIVED)).toBe(
      false,
    );
  });

  it('should return false for ELIMINATED → any (terminal)', () => {
    expect(
      canTransitionTo(ProductStatus.ELIMINATED, ProductStatus.ACTIVE),
    ).toBe(false);
    expect(canTransitionTo(ProductStatus.ELIMINATED, ProductStatus.DRAFT)).toBe(
      false,
    );
  });

  it('should return false for same-status transitions (no-op)', () => {
    expect(canTransitionTo(ProductStatus.DRAFT, ProductStatus.DRAFT)).toBe(
      false,
    );
    expect(canTransitionTo(ProductStatus.ACTIVE, ProductStatus.ACTIVE)).toBe(
      false,
    );
    expect(
      canTransitionTo(ProductStatus.ARCHIVED, ProductStatus.ARCHIVED),
    ).toBe(false);
    expect(
      canTransitionTo(ProductStatus.ELIMINATED, ProductStatus.ELIMINATED),
    ).toBe(false);
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
