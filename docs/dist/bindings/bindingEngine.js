import { resolveTarget } from "../targetResolver.js";
export class BindingEngine {
    constructor() {
        this.disposers = [];
        this.timeouts = [];
    }
    bind(bindings, context) {
        for (const binding of bindings) {
            if (binding.event === "timer") {
                const timeoutId = window.setTimeout(async () => {
                    const errors = await context.actionEngine.run(binding.actions, {
                        controller: context.controller,
                        diagram: context.diagram,
                        event: {
                            type: "timer",
                            target: null,
                            currentTarget: null,
                            originalEvent: null,
                            timeStamp: Date.now()
                        },
                        camera: context.camera,
                        overlay: context.overlay
                    }, context.errorPolicy);
                    for (const error of errors) {
                        context.onError(error);
                    }
                }, binding.delayMs ?? 0);
                this.timeouts.push(timeoutId);
                continue;
            }
            const defaultTarget = binding.event === "key" ? context.diagram.getContainer() : context.diagram.getRoot();
            const target = resolveTarget(context.diagram, binding.target) ?? defaultTarget;
            const eventName = binding.event === "click"
                ? "click"
                : binding.event === "hover"
                    ? "mouseenter"
                    : binding.event === "key"
                        ? "keydown"
                        : binding.eventName ?? binding.event;
            const handler = async (event) => {
                if (binding.event === "key" && binding.key) {
                    const key = event.key;
                    if (key !== binding.key) {
                        return;
                    }
                }
                const normalized = normalizeEvent(event, eventName);
                const errors = await context.actionEngine.run(binding.actions, {
                    controller: context.controller,
                    diagram: context.diagram,
                    event: normalized,
                    camera: context.camera,
                    overlay: context.overlay
                }, context.errorPolicy);
                for (const error of errors) {
                    context.onError(error);
                }
            };
            target.addEventListener(eventName, handler);
            this.disposers.push(() => target.removeEventListener(eventName, handler));
        }
    }
    destroy() {
        for (const disposer of this.disposers) {
            disposer();
        }
        for (const timeout of this.timeouts) {
            window.clearTimeout(timeout);
        }
        this.disposers = [];
        this.timeouts = [];
    }
}
const normalizeEvent = (event, type) => {
    if (event instanceof MouseEvent) {
        return {
            type,
            target: event.target,
            currentTarget: event.currentTarget,
            clientX: event.clientX,
            clientY: event.clientY,
            timeStamp: event.timeStamp,
            originalEvent: event
        };
    }
    if (event instanceof KeyboardEvent) {
        return {
            type,
            target: event.target,
            currentTarget: event.currentTarget,
            key: event.key,
            timeStamp: event.timeStamp,
            originalEvent: event
        };
    }
    return {
        type,
        target: event.target,
        currentTarget: event.currentTarget,
        timeStamp: event.timeStamp,
        originalEvent: event
    };
};
//# sourceMappingURL=bindingEngine.js.map