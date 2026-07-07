export class VerificationToken {
  static create(value: string): VerificationToken {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Verification token cannot be empty');
    }

    return new VerificationToken(trimmed);
  }

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  equals(other: VerificationToken): boolean {
    return other instanceof VerificationToken && this.value === other.value;
  }
}
