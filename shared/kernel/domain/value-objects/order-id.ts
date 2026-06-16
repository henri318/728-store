import { EntityId } from './entity-id';

export class OrderId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): OrderId {
    return new OrderId(value);
  }
}
