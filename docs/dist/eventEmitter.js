export class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        const set = this.listeners.get(event) ?? new Set();
        set.add(handler);
        this.listeners.set(event, set);
        return () => {
            set.delete(handler);
        };
    }
    emit(event, payload) {
        const handlers = this.listeners.get(event);
        if (!handlers) {
            return;
        }
        for (const handler of handlers) {
            handler(payload);
        }
    }
    clear() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=eventEmitter.js.map