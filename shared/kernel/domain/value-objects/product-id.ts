import { EntityId } from './entity-id';

export class ProductId extends EntityId {
  static create(value: string): ProductId {
    return new ProductId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
