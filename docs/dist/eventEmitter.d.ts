type EventHandler = (payload: unknown) => void;
export declare class EventEmitter {
    private listeners;
    on(event: string, handler: EventHandler): () => void;
    emit(event: string, payload: unknown): void;
    clear(): void;
}
export {};
//# sourceMappingURL=eventEmitter.d.ts.map