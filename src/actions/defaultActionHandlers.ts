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
      // #region agent log
      const logAction1 = {location:'defaultActionHandlers.ts:59',message:'camera.fit entry',data:{hasCamera:!!context.camera,target:action.payload?.target},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
      console.log('[DEBUG]', logAction1);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAction1)}).catch(()=>{});
      // #endregion
      if (!context.camera) {
        return;
      }
      const target = action.payload?.target as TargetDescriptor | undefined;
      const resolved = resolveTarget(context.diagram, target);
      // #region agent log
      const resolvedInfo = resolved ? {
        tagName:resolved.tagName,
        id:resolved.id,
        dataId:resolved.getAttribute('data-id'),
        isSVGGraphics:resolved instanceof SVGGraphicsElement,
        className:resolved instanceof SVGElement ? (typeof resolved.className === 'string' ? resolved.className : resolved.className.baseVal) : '',
        parentTagName:resolved.parentElement?.tagName,
        parentClassName:resolved.parentElement instanceof SVGElement ? (typeof resolved.parentElement.className === 'string' ? resolved.parentElement.className : resolved.parentElement.className.baseVal) : ''
      } : null;
      const logAction2 = {location:'defaultActionHandlers.ts:65',message:'target resolved',data:{target,resolved:resolvedInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
      console.log('[DEBUG]', logAction2);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAction2)}).catch(()=>{});
      // #endregion
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
      // #region agent log
      const logHighlight = {
        location:'defaultActionHandlers.ts:117',
        message:'style.highlight',
        data:{
          target,
          elementsCount:elements.length,
          elements:elements.map(el=>({
            tagName:el.tagName,
            id:el.id,
            dataId:el.getAttribute('data-id'),
            className:el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
            hasHighlightClass:el.classList.contains(className)
          }))
        },
        timestamp:Date.now(),
        sessionId:'debug-session',
        runId:'run1',
        hypothesisId:'E'
      };
      console.log('[DEBUG]', logHighlight);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logHighlight)}).catch(()=>{});
      // #endregion
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
