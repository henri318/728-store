type EventHandler = (data: any) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    const existingHandlers = this.handlers.get(event) || [];
    this.handlers.set(event, [...existingHandlers, handler]);
  }

  async emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || [];
    const results = handlers.map(handler => {
      try {
        return handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for event ${event}:`, error);
      }
    });
    await Promise.all(results);
  }
}

export const eventBus = new EventBus();
