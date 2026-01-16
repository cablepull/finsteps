type EventHandler = (payload: unknown) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    const set = this.listeners.get(event) ?? new Set<EventHandler>();
    set.add(handler);
    this.listeners.set(event, set);
    return () => {
      set.delete(handler);
    };
  }

  emit(event: string, payload: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
