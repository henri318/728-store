/**
 * @deprecated Re-export from shared/authorization/.
 * Import `requireRole` / `assertRole` from `@/shared/authorization` instead.
 * This file will be removed in S6 (cleanup).
 */
export { requireRole, assertRole } from '@/shared/authorization/authorization';
export { createAuthorization } from '@/shared/authorization/require-role';
