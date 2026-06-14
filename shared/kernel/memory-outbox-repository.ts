export interface OutboxRepository {
  saveEvent(eventType: string, payload: any): Promise<void>;
}

export class MemoryOutboxRepository implements OutboxRepository {
  public events: { eventType: string; payload: any }[] = [];

  async saveEvent(eventType: string, payload: any): Promise<void> {
    this.events.push({ eventType, payload });
  }
}
