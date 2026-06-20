import type { Role } from '@/modules/roles/domain/roles';

/**
 * Role-to-route mapping configuration.
 *
 * Maps each role to the set of route patterns it is authorized to access.
 * Used by authorization proxy to determine access at the route level.
 *
 * Pattern format: glob-style with wildcards (e.g. `/api/admin/*`).
 */
export const ROLE_ROUTES: Record<Role, string[]> = {
  ADMIN: ['/api/admin/*', '/api/orders/*'],
  SUPPORT: ['/api/tickets/*'],
  DESIGNER: ['/api/products/customize/*'],
  CUSTOMER: [],
};
