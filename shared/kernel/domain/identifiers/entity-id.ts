export abstract class EntityId {
  readonly value: string;

  protected constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('EntityId cannot be empty');
    }
    this.value = value.trim();
  }

  equals(other: EntityId): boolean {
    return other instanceof this.constructor && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
