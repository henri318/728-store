import { EntityId } from './entity-id';

export class TicketId extends EntityId {
  static create(value: string): TicketId {
    return new TicketId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
