import { EntityId } from './entity-id';

export class SellerId extends EntityId {
  static create(value: string): SellerId {
    return new SellerId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
