/**
 * Application base URL used to build absolute links (e.g., email verification
 * links, password reset links, etc.).
 *
 * Source of truth: the `NEXT_PUBLIC_APP_URL` environment variable, with
 * `APP_URL` accepted as a server-only fallback.
 *
 * SECURITY: never derive this from request headers. Trusting `Host` or
 * `X-Forwarded-Proto` enables host header injection and token exfiltration
 * via attacker-crafted email links.
 */

const RAW_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;

if (!RAW_BASE_URL) {
  throw new Error(
    '[URL] NEXT_PUBLIC_APP_URL (or APP_URL) environment variable is required'
  );
}

// Strip trailing slashes so link composition is predictable.
export const APP_BASE_URL: string = RAW_BASE_URL.replace(/\/+$/, '');

export function getBaseUrl(): string {
  return APP_BASE_URL;
}
