export class Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;

  private constructor(street: string, city: string, postalCode: string, country: string) {
    this.street = street;
    this.city = city;
    this.postalCode = postalCode;
    this.country = country;
  }

  static create(street: string, city: string, postalCode: string, country: string): Address {
    const trimmedStreet = street.trim();
    const trimmedCity = city.trim();
    const trimmedPostalCode = postalCode.trim();
    const trimmedCountry = country.trim();

    if (!trimmedStreet || !trimmedCity || !trimmedPostalCode || !trimmedCountry) {
      throw new Error('All address fields are required');
    }

    return new Address(trimmedStreet, trimmedCity, trimmedPostalCode, trimmedCountry);
  }

  equals(other: Address): boolean {
    return other instanceof Address
      && this.street === other.street
      && this.city === other.city
      && this.postalCode === other.postalCode
      && this.country === other.country;
  }
}
