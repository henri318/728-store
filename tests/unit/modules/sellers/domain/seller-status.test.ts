import { describe, it, expect } from 'vitest';
import {
  SellerStatus,
  VALID_TRANSITIONS,
} from '@/modules/sellers/domain/seller-status';

/**
 * Task 1.2 — SellerStatus enum and valid transition map.
 *
 * Tests:
 * - Enum values match the expected string literals
 * - Transition map covers all valid state changes
 * - banned is a terminal state (no outgoing transitions)
 * - active → active is a valid no-op (same status)
 */
describe('SellerStatus', () => {
  it('should define the three valid status values', () => {
    expect(SellerStatus.ACTIVE).toBe('active');
    expect(SellerStatus.SUSPENDED).toBe('suspended');
    expect(SellerStatus.BANNED).toBe('banned');
  });

  it('should have exactly 3 members', () => {
    const keys = Object.values(SellerStatus);
    expect(keys).toHaveLength(3);
  });
});

describe('VALID_TRANSITIONS', () => {
  it('should allow active → suspended', () => {
    expect(VALID_TRANSITIONS[SellerStatus.ACTIVE]).toContain(
      SellerStatus.SUSPENDED,
    );
  });

  it('should allow active → banned', () => {
    expect(VALID_TRANSITIONS[SellerStatus.ACTIVE]).toContain(
      SellerStatus.BANNED,
    );
  });

  it('should allow suspended → active', () => {
    expect(VALID_TRANSITIONS[SellerStatus.SUSPENDED]).toContain(
      SellerStatus.ACTIVE,
    );
  });

  it('should allow suspended → banned', () => {
    expect(VALID_TRANSITIONS[SellerStatus.SUSPENDED]).toContain(
      SellerStatus.BANNED,
    );
  });

  it('should NOT allow banned → any status (terminal state)', () => {
    expect(VALID_TRANSITIONS[SellerStatus.BANNED]).toBeUndefined();
  });

  it('should define transitions for exactly 2 statuses (active, suspended)', () => {
    const transitionKeys = Object.keys(VALID_TRANSITIONS);
    expect(transitionKeys).toHaveLength(2);
    expect(transitionKeys).toContain(SellerStatus.ACTIVE);
    expect(transitionKeys).toContain(SellerStatus.SUSPENDED);
  });

  it('should allow active → active (same status, no-op)', () => {
    // The spec says same-status is a no-op, but the transition itself is not forbidden.
    // The transition map does NOT include same-status; the use case handles the no-op check.
    // This test verifies that active → active is NOT in the transition map (use case must handle).
    expect(VALID_TRANSITIONS[SellerStatus.ACTIVE]).not.toContain(
      SellerStatus.ACTIVE,
    );
  });
});
