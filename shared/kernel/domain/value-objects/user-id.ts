import { EntityId } from './entity-id';

export class UserId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): UserId {
    return new UserId(value);
  }
}
