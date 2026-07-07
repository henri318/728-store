import { EntityId } from './entity-id';

export class UserId extends EntityId {
  static create(value: string): UserId {
    return new UserId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
