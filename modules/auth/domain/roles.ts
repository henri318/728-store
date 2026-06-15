/**
 * Roles — canonical type for the authorization system.
 *
 * Lives in the auth module's domain layer so both infrastructure adapters
 * and domain ports can reference it without crossing module boundaries.
 */
export const ROLES = ['guest', 'client', 'shop', 'admin'] as const;
export type Role = typeof ROLES[number];
