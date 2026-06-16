import { EntityId } from './entity-id';

export class TicketId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): TicketId {
    return new TicketId(value);
  }
}
