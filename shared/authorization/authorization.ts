/**
 * Infrastructure shim — wires the authorization factory to the container's
 * concrete ports. Callers that depend on `requireRole` / `assertRole` as
 * direct imports continue to work without changes.
 *
 * For isolated use (tests, multi-tenant), import createAuthorization directly
 * from `@/shared/authorization/require-role` and pass your own ports.
 */
import { createAuthorization } from './require-role';
import { container } from '@/composition-root/container';

const _auth = createAuthorization(
  container.getSession(),
  container.getUserLookup(),
);

export const requireRole = _auth.requireRole;
export const assertRole = _auth.assertRole;
