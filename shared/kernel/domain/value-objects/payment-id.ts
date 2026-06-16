import { EntityId } from './entity-id';

export class PaymentId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): PaymentId {
    return new PaymentId(value);
  }
}
