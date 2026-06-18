/**
 * @deprecated This file will be removed in S6 (cleanup).
 * Roles are moving to `@/modules/roles/domain/roles`.
 *
 * **Migration plan:**
 * - `guest|client|shop|admin` → `CUSTOMER|ADMIN|SUPPORT|DESIGNER` (S3/S4).
 * - The new Role type lives in `@/modules/roles/domain/roles`.
 * - During transition, new code imports from `@/modules/roles/` while
 *   existing code continues using this file until S6 removes it.
 * - Do NOT add new imports of this file — use the roles module instead.
 *
 * @see {@link @/modules/roles/domain/roles}
 */
export { ROLES } from '@/modules/roles/domain/roles';
export type { Role } from '@/modules/roles/domain/roles';
