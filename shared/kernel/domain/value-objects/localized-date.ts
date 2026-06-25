/**
 * Locale-aware date value object.
 *
 * Wraps a Date and the active route locale so formatting is
 * consistent across server and client components.
 *
 * @example
 *   const d = LocalizedDate.create(seller.createdAt, locale);
 *   {d.toString()}  // "25/6/2026" for es
 */
export class LocalizedDate {
  readonly date: Date;
  readonly locale: string;

  private constructor(date: Date, locale: string) {
    this.date = date;
    this.locale = locale;
  }

  static create(date: Date | string | number, locale: string): LocalizedDate {
    if (!locale) {
      throw new Error('LocalizedDate requires a locale');
    }

    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) {
      throw new Error('LocalizedDate received an invalid date');
    }

    return new LocalizedDate(d, locale);
  }

  /** Format using the route locale, e.g. "25/6/2026". */
  toString(): string {
    return this.date.toLocaleDateString(this.locale);
  }

  equals(other: LocalizedDate): boolean {
    return (
      other instanceof LocalizedDate &&
      this.date.getTime() === other.date.getTime() &&
      this.locale === other.locale
    );
  }
}
