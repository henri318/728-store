import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecrypt } from 'jose';
import { hkdf } from '@panva/hkdf';

const locales = ['es', 'cat'];
const defaultLocale = 'es';

/** Path prefixes that require authentication (guest-level or above). */
const protectedPaths = ['/dashboard', '/api/admin', '/api/orders', '/profile', '/api/users'];

/**
 * Strips a known locale prefix from a pathname if present.
 * Returns the pathname as-is if no locale prefix is found.
 */
function stripLocale(pathname: string): string {
  for (const locale of locales) {
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const stripped = pathname.slice(prefix.length) || '/';
      return stripped;
    }
  }
  return pathname;
}

/**
 * Derives the JWE decryption key from NEXTAUTH_SECRET using HKDF.
 * This replicates NextAuth's own key derivation so we can verify
 * the session token in Edge Runtime.
 */
async function deriveKey(secret: string): Promise<Uint8Array> {
  return hkdf(
    'sha256',
    new TextEncoder().encode(secret),
    'NextAuth.js Generated Encryption Key',
    '',
    32,
  );
}

/**
 * Attempts to verify a NextAuth session token (JWE-encrypted JWT).
 * Returns the decoded payload on success, or `null` if invalid/expired.
 */
async function verifySessionToken(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const encryptionSecret = await deriveKey(secret);
    const { payload } = await jwtDecrypt(token, encryptionSecret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Auth gate for protected routes ----
  const strippedPath = stripLocale(pathname);
  const isProtected = protectedPaths.some(
    (p) => strippedPath.startsWith(p) || pathname.startsWith(p),
  );

  if (isProtected) {
    // Try both possible cookie names (secure/unsecure)
    const sessionCookie =
      request.cookies.get('__Secure-next-auth.session-token')?.value ??
      request.cookies.get('next-auth.session-token')?.value;

    const secret = process.env.NEXTAUTH_SECRET;
    if (!sessionCookie || !secret) {
      return unauthorizedResponse(request, pathname);
    }

    const payload = await verifySessionToken(sessionCookie, secret);
    if (!payload) {
      return unauthorizedResponse(request, pathname);
    }

    // Check if user account has been soft-deleted
    const userId = payload.sub ?? payload.id;
    if (userId && typeof userId === 'string') {
      try {
        const { container } = await import('@/composition-root/container');
        const userRepo = container.getUserRepository();
        const user = await userRepo.findById(userId);
        if (!user || user.deletedAt) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } catch {
        // If user lookup fails for any reason, deny access
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // ---- Locale redirect (only for pages, not API routes) ----
  // API routes matched by the matcher (e.g. /api/admin/*, /api/orders/*)
  // should only go through the auth gate above, not the locale redirect.
  if (pathname.startsWith('/api/')) {
    return;
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) return;

  // Redirect if there is no locale
  const locale = defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

/**
 * Returns a 401 JSON response for API routes, or a redirect to sign in for pages.
 */
function unauthorizedResponse(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locale = pathname.split('/')[1] || defaultLocale;
  const homeUrl = new URL(`/${locale}`, request.url);
  homeUrl.searchParams.set('login', 'required');
  return NextResponse.redirect(homeUrl);
}

export const config = {
  matcher: [
    // Existing — pages and non-api, non-static paths
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
    // Protected API routes (explicitly added since the regex above excludes /api)
    '/api/admin/:path*',
    '/api/orders/:path*',
    '/api/users/:path*',
  ],
};
