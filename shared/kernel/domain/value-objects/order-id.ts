import { EntityId } from './entity-id';

export class OrderId extends EntityId {
  static create(value: string): OrderId {
    return new OrderId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
