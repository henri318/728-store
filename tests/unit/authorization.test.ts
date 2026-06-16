import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthorization } from '@/modules/auth/application/require-role';
import { MemoryUserLookup } from '@/tests/doubles/memory-user-lookup';
import { MemorySession } from '@/tests/doubles/memory-session';
import { Role } from '@/modules/auth/domain/roles';

/**
 * Tests for the authorization factory.
 *
 * The factory takes a SessionPort + UserLookupPort and returns {requireRole, assertRole}.
 * Both are injected via test doubles — no NextAuth, no Prisma.
 */
describe('createAuthorization', () => {
  let lookup: MemoryUserLookup;
  let session: MemorySession;
  let auth: ReturnType<typeof createAuthorization>;

  beforeEach(() => {
    vi.clearAllMocks();
    lookup = new MemoryUserLookup();
    session = new MemorySession();
    auth = createAuthorization(session, lookup);
  });

  describe('requireRole', () => {
    it('should allow a handler when the session user has the required role', async () => {
      lookup.seed({ id: 'u1', role: 'admin' });
      session.setSession('u1');

      const innerHandler = vi.fn().mockResolvedValue(new Response('ok'));
      const wrapped = auth.requireRole('admin')(innerHandler);

      const response = await wrapped(new Request('http://test/'));

      expect(innerHandler).toHaveBeenCalledTimes(1);
      expect(response).toBeInstanceOf(Response);
    });

    it('should reject with 403 when the role does not match', async () => {
      lookup.seed({ id: 'u1', role: 'client' });
      session.setSession('u1');

      const innerHandler = vi.fn();
      const wrapped = auth.requireRole('admin')(innerHandler);

      const response = (await wrapped(new Request('http://test/'))) as Response;
      const body = await response.json();

      expect(innerHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: 'Forbidden' });
    });

    it('should reject with 401 when there is no session', async () => {
      // session is null by default (no setSession call)

      const innerHandler = vi.fn();
      const wrapped = auth.requireRole('admin')(innerHandler);

      const response = (await wrapped(new Request('http://test/'))) as Response;
      const body = await response.json();

      expect(innerHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should reject with 403 when the user is not found in the database', async () => {
      session.setSession('ghost');
      // lookup has no record for 'ghost'

      const innerHandler = vi.fn();
      const wrapped = auth.requireRole('admin')(innerHandler);

      const response = (await wrapped(new Request('http://test/'))) as Response;
      expect(response.status).toBe(403);
    });

    it('should accept multiple allowed roles', async () => {
      lookup.seed({ id: 'u1', role: 'shop' });
      session.setSession('u1');

      const innerHandler = vi.fn().mockResolvedValue(new Response('ok'));
      const wrapped = auth.requireRole('admin', 'shop')(innerHandler);

      await wrapped(new Request('http://test/'));
      expect(innerHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('assertRole', () => {
    it('should return the session when role matches', async () => {
      lookup.seed({ id: 'u1', role: 'admin' });
      session.setSession('u1');

      const result = await auth.assertRole('admin');
      expect(result).toBeDefined();
      expect(result.id).toBe('u1');
    });

    it('should throw AUTH_REQUIRED when no session', async () => {
      await expect(auth.assertRole('admin')).rejects.toThrow('AUTH_REQUIRED');
    });

    it('should throw FORBIDDEN when role does not match', async () => {
      lookup.seed({ id: 'u1', role: 'client' });
      session.setSession('u1');

      await expect(auth.assertRole('admin')).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('integration with Role type', () => {
    it('should accept all valid roles', async () => {
      const roles: Role[] = ['admin', 'client', 'shop', 'guest'];
      for (const role of roles) {
        lookup.seed({ id: `u-${role}`, role });
        session.setSession(`u-${role}`);

        const inner = vi.fn().mockResolvedValue(new Response('ok'));
        const wrapped = auth.requireRole(role)(inner);
        await wrapped(new Request('http://test/'));
        expect(inner).toHaveBeenCalledTimes(1);
      }
    });
  });
});
