export type ErrorPolicy = "haltOnError" | "continueOnError";

export interface PresentationAst {
  steps: StepDefinition[];
  bindings?: BindingDefinition[];
}

export interface StepDefinition {
  id: string;
  name?: string;
  actions: ActionDefinition[];
  bindings?: BindingDefinition[];
  errorPolicy?: ErrorPolicy;
}

export interface ActionDefinition {
  type: string;
  payload?: Record<string, unknown>;
}

export type BindingEventType = "click" | "hover" | "key" | "timer" | "custom";

export interface BindingDefinition {
  event: BindingEventType;
  target?: TargetDescriptor;
  key?: string;
  delayMs?: number;
  eventName?: string;
  actions: ActionDefinition[];
}

export interface TargetDescriptor {
  element?: Element;
  selector?: string;
  id?: string;
  dataId?: string;
}

export interface NormalizedEvent {
  type: string;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  key?: string;
  clientX?: number;
  clientY?: number;
  timeStamp?: number;
  originalEvent: Event | null;
}

export interface DiagramHandle {
  getRoot(): SVGSVGElement;
  getContainer(): HTMLElement;
  resolveTarget(target: TargetDescriptor): Element | null;
  destroy(): void;
}

export interface DiagramAdapter {
  render(options: { mountEl: HTMLElement; mermaidText: string }): Promise<DiagramHandle> | DiagramHandle;
}

export interface CameraHandle {
  fit(target: Element, options?: { padding?: number }): Promise<void> | void;
  reset(): void;
  destroy(): void;
}

export interface OverlayHandle {
  showBubble(options: { id?: string; target: Element; text: string }): void;
  hideBubble(id?: string): void;
  destroy(): void;
}

export interface ActionContext {
  controller: Controller;
  diagram: DiagramHandle;
  camera?: CameraHandle;
  overlay?: OverlayHandle;
  event?: NormalizedEvent;
}

export type ActionHandler = (
  context: ActionContext,
  action: ActionDefinition
) => void | Promise<void>;

export type ActionHandlerMap = Record<string, ActionHandler>;

export interface ControllerState {
  stepIndex: number;
  stepId?: string;
  stepCount: number;
}

export interface Controller {
  next(): Promise<void>;
  prev(): Promise<void>;
  goto(step: number | string): Promise<void>;
  reset(): Promise<void>;
  destroy(): void;
  getState(): ControllerState;
  setState(partial: Partial<ControllerState>): Promise<void>;
  on(
    event: "stepchange" | "actionerror" | "error" | "render",
    handler: (payload: unknown) => void
  ): () => void;
}

export interface PresentMermaidOptions {
  mountEl: HTMLElement;
  mermaidText: string;
  mpdText?: string;
  ast?: PresentationAst;
  options?: {
    parseMpd?: (input: string) => PresentationAst;
    diagram?: DiagramAdapter;
    camera?: CameraHandle;
    overlay?: OverlayHandle;
    actionHandlers?: ActionHandlerMap;
    errorPolicy?: ErrorPolicy;
  };
}
