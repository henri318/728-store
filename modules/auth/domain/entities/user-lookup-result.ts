/**
 * Auth-local role type — does NOT import from the roles module.
 * This is a string literal type that mirrors the roles module's Role type
 * without creating a cross-module dependency.
 */
export type AuthRole = 'ADMIN' | 'SUPPORT' | 'DESIGNER' | 'CUSTOMER';

export interface UserLookupResult {
  id: string;
  role: AuthRole;
}
