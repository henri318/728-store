/**
 * Normalizes text by removing diacritics/accents for accent-insensitive
 * search comparison. Uses Unicode NFD decomposition to split base
 * characters from combining marks, then strips the mark range.
 *
 * Examples:
 *   "café"     → "cafe"
 *   "camiseta" → "camiseta"
 *   "jalapeño" → "jalapeno"
 *   "São Paulo" → "Sao Paulo"
 */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
