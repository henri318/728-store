/**
 * Escape user-controlled values before interpolating into HTML email
 * templates. Prevents XSS via the recipient's name (or any other user
 * input rendered as HTML).
 *
 * Pure utility — no env, no SDKs. Safe in any layer.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
