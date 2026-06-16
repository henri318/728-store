import { EntityId } from './entity-id';

export class SellerId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): SellerId {
    return new SellerId(value);
  }
}
