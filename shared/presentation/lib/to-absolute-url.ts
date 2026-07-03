export function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}
