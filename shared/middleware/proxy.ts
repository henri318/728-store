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
  '/seller',
  '/api/users',
  '/auth/change-password',
];

function isKnownLocale(segment: string): boolean {
  return locales.includes(segment);
}

function matchesProtectedPath(
  pathname: string,
  protectedPath: string,
): boolean {
  const pathnameSegments = pathname.split('/').filter(Boolean);
  const protectedSegments = protectedPath.split('/').filter(Boolean);

  if (pathnameSegments.length < protectedSegments.length) {
    return false;
  }

  const directMatch = protectedSegments.every(
    (segment, index) => pathnameSegments[index] === segment,
  );
  if (directMatch) {
    return true;
  }

  const localePrefixedMatch = protectedSegments.every(
    (segment, index) =>
      isKnownLocale(pathnameSegments[0] ?? '') &&
      pathnameSegments[index + 1] === segment,
  );
  return localePrefixedMatch;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Auth gate for protected routes ----
  const isProtected = protectedPaths.some((path) =>
    matchesProtectedPath(pathname, path),
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

  const requestedLocale = pathname.split('/')[1];
  const locale = locales.includes(requestedLocale)
    ? requestedLocale
    : defaultLocale;
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
