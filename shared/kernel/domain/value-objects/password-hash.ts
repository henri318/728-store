export class PasswordHash {
  readonly value: string;

  static create(hash: string): PasswordHash {
    const trimmed = hash.trim();

    if (trimmed.length === 0) {
      throw new Error('Password hash cannot be empty');
    }

    if (trimmed.length < 8) {
      throw new Error('Password hash must be at least 8 characters');
    }

    return new PasswordHash(trimmed);
  }

  private constructor(value: string) {
    this.value = value;
  }

  equals(other: PasswordHash): boolean {
    return other instanceof PasswordHash && this.value === other.value;
  }
}
