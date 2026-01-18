import { ActionError } from "../errors.js";
import { ActionHandlerMap, ActionDefinition, ActionContext, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";

type HighlightState = {
  className: string;
  elements: Set<Element>;
};

const ensureHighlight = (state: HighlightState, elements: Element[], className: string): void => {
  for (const element of state.elements) {
    element.classList.remove(state.className);
  }
  state.elements.clear();
  state.className = className;
  for (const element of elements) {
    element.classList.add(className);
    state.elements.add(element);
  }
};

const getTargets = (context: ActionContext, target?: TargetDescriptor): Element[] => {
  if (!target) {
    return [];
  }
  const resolved = resolveTarget(context.diagram, target);
  return resolved ? [resolved] : [];
};

export const createDefaultActionHandlers = (): ActionHandlerMap => {
  const highlightState: HighlightState = {
    className: "finsteps-highlight",
    elements: new Set<Element>()
  };

  const handlers: ActionHandlerMap = {
    "nav.next": async ({ controller }) => {
      await controller.next();
    },
    "nav.prev": async ({ controller }) => {
      await controller.prev();
    },
    "nav.goto": async ({ controller }, action) => {
      const index = action.payload?.index;
      const id = action.payload?.id;
      if (typeof index === "number") {
        await controller.goto(index);
        return;
      }
      if (typeof id === "string") {
        await controller.goto(id);
        return;
      }
      throw new ActionError("nav.goto requires index or id", "MPF_ACTION_INVALID_ARGS");
    },
    "nav.reset": async ({ controller }) => {
      await controller.reset();
    },
    "camera.fit": async (context, action) => {
      if (!context.camera) {
        return;
      }
      const target = action.payload?.target as TargetDescriptor | undefined;
      const resolved = resolveTarget(context.diagram, target);
      if (!resolved) {
        throw new ActionError("camera.fit missing target", "MPF_ACTION_INVALID_ARGS");
      }
      
      // Extract duration - support both "durationMs" (from DSL example) and "duration"
      const durationMs = action.payload?.durationMs as number | undefined;
      const duration = durationMs ?? (action.payload?.duration as number | undefined);
      
      // Extract easing - support easing name
      const easing = action.payload?.easing as string | undefined;
      
      await context.camera.fit(resolved, {
        padding: typeof action.payload?.padding === "number" ? action.payload.padding : undefined,
        duration: typeof duration === "number" ? duration : undefined,
        easing: typeof easing === "string" ? easing : undefined,
      });
    },
    "camera.reset": ({ camera }) => {
      camera?.reset();
    },
    "camera.fitAll": (context, action) => {
      if (!context.camera) {
        return;
      }
      const padding = typeof action.payload?.padding === "number" ? action.payload.padding : undefined;
      if (context.camera.fitAll) {
        context.camera.fitAll(padding);
      } else if (context.camera.reset) {
        context.camera.reset();
      }
    },
    "overlay.bubble": (context, action) => {
      if (!context.overlay) {
        return;
      }
      const target = action.payload?.target as TargetDescriptor | undefined;
      const resolved = resolveTarget(context.diagram, target);
      if (!resolved) {
        throw new ActionError("overlay.bubble missing target", "MPF_ACTION_INVALID_ARGS");
      }
      const text = String(action.payload?.text ?? "");
      context.overlay.showBubble({
        id: typeof action.payload?.id === "string" ? action.payload.id : undefined,
        target: resolved,
        text
      });
    },
    "overlay.hide": (context, action) => {
      context.overlay?.hideBubble(
        typeof action.payload?.id === "string" ? action.payload.id : undefined
      );
    },
    "style.highlight": (context, action) => {
      const target = action.payload?.target as TargetDescriptor | undefined;
      const className =
        typeof action.payload?.className === "string" ? action.payload.className : "finsteps-highlight";
      const elements = getTargets(context, target);
      ensureHighlight(highlightState, elements, className);
    },
    "style.clear": () => {
      ensureHighlight(highlightState, [], highlightState.className);
    },
    "wait": async (_context, action) => {
      const delayMs = typeof action.payload?.ms === "number" ? action.payload.ms : 0;
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  };

  return handlers;
};

export const buildActionContext = (context: ActionContext): ActionContext => {
  return context;
};

export const coerceAction = (action: ActionDefinition): ActionDefinition => action;
