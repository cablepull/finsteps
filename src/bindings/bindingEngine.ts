import type { CameraHandle, Controller, OverlayHandle } from "../types.js";
import { BindingDefinition, DiagramHandle, NormalizedEvent, ErrorPolicy } from "../types.js";
import { ActionEngine } from "../actions/actionEngine.js";
import { resolveTarget } from "../targetResolver.js";

type BindingContext = {
  diagram: DiagramHandle;
  actionEngine: ActionEngine;
  errorPolicy: ErrorPolicy;
  onError: (error: Error) => void;
  controller: Controller;
  camera?: CameraHandle;
  overlay?: OverlayHandle;
};

export class BindingEngine {
  private disposers: Array<() => void> = [];
  private timeouts: number[] = [];

  bind(bindings: BindingDefinition[], context: BindingContext): void {
    for (const binding of bindings) {
      if (binding.event === "timer") {
        const timeoutId = window.setTimeout(async () => {
          const errors = await context.actionEngine.run(
            binding.actions,
            {
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
            },
            context.errorPolicy
          );
          for (const error of errors) {
            context.onError(error);
          }
        }, binding.delayMs ?? 0);
        this.timeouts.push(timeoutId);
        continue;
      }

      const defaultTarget =
        binding.event === "key" ? window : context.diagram.getRoot();
      const target = resolveTarget(context.diagram, binding.target) ?? defaultTarget;
      const eventName =
        binding.event === "click"
          ? "click"
          : binding.event === "hover"
            ? "mouseenter"
            : binding.event === "key"
              ? "keydown"
              : binding.eventName ?? binding.event;

      const handler = async (event: Event) => {
        if (binding.event === "key" && binding.key) {
          const key = (event as KeyboardEvent).key;
          if (key !== binding.key) {
            return;
          }
        }
        const normalized = normalizeEvent(event, eventName);
        const errors = await context.actionEngine.run(
          binding.actions,
          {
            controller: context.controller,
            diagram: context.diagram,
            event: normalized,
            camera: context.camera,
            overlay: context.overlay
          },
          context.errorPolicy
        );
        for (const error of errors) {
          context.onError(error);
        }
      };

      target.addEventListener(eventName, handler);
      this.disposers.push(() => target.removeEventListener(eventName, handler));
    }
  }

  destroy(): void {
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

const normalizeEvent = (event: Event, type: string): NormalizedEvent => {
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
