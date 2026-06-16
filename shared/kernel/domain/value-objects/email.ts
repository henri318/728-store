export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(email: string): Email {
    const trimmed = email.trim().toLowerCase();

    if (trimmed.length === 0) {
      throw new Error('Email cannot be empty');
    }

    if (trimmed.length > 254) {
      throw new Error('Email must be at most 254 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('Invalid email format');
    }

    return new Email(trimmed);
  }

  equals(other: Email): boolean {
    return other instanceof Email && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
