import { EntityId } from './entity-id';

export class ProductId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ProductId {
    return new ProductId(value);
  }
}
