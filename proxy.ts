import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const locales = ['es', 'cat'];
const defaultLocale = 'es';

/** Path prefixes that require authentication (guest-level or above). */
const protectedPaths = [
  '/dashboard',
  '/api/admin',
  '/api/orders',
  '/profile',
  '/api/users',
  '/auth/change-password',
];

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Auth gate for protected routes ----
  const strippedPath = stripLocale(pathname);
  const isProtected = protectedPaths.some(
    (p) => strippedPath.startsWith(p) || pathname.startsWith(p),
  );

  if (isProtected) {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req: request, secret });

    if (!token) {
      return unauthorizedResponse(request, pathname);
    }

    // Check if user account has been soft-deleted
    const userId = token.sub;
    if (userId) {
      try {
        const { container } = await import('@/composition-root/container');
        const userRepo = container.getUserRepository();
        const user = await userRepo.findById(userId);
        if (!user || user.deletedAt) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // ---- Locale redirect (only for pages, not API routes) ----
  // API routes matched by the matcher (e.g. /api/admin/*, /api/orders/*)
  // should only go through the auth gate above, not the locale redirect.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Static assets in /public don't need locale prefix
  if (
    pathname.startsWith('/img/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg'
  ) {
    return NextResponse.next();
  }

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
  return NextResponse.redirect(homeUrl);
}

export const config = {
  matcher: [
    // Pages and non-api paths (including /img/ static assets)
    '/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|.*\\.png$).*)',
    // Protected API routes (explicitly added since the regex above excludes /api)
    '/api/admin/:path*',
    '/api/orders/:path*',
    '/api/users/:path*',
  ],
};
