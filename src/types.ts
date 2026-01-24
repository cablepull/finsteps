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
  getStrategy?(): import("./adapters/diagramStrategies.js").DiagramStrategy;
  destroy(): void;
}

export interface DiagramAdapter {
  render(options: { mountEl: HTMLElement; mermaidText: string }): Promise<DiagramHandle> | DiagramHandle;
}

export interface CameraHandle {
  fit(target: Element, options?: { 
    padding?: number;
    duration?: number;  // Animation duration in milliseconds
    easing?: string;    // Easing function name (e.g., "linear", "easeInOut", "cubicOut")
  }): Promise<void> | void;
  reset(): void;
  zoom?(factor: number, center?: { x: number; y: number }): void;
  pan?(deltaX: number, deltaY: number): void;
  fitAll?(padding?: number): void;
  destroy(): void;
}

export interface OverlayHandle {
  showBubble(options: { id?: string; target: Element; text: string }): void;
  hideBubble(id?: string): void;
  clear?(): void;
  destroy(): void;
}

export interface ControlsHandle {
  show(): void;
  hide(): void;
  updateState(state: ControllerState): void;
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
  errorState?: {
    hasError: boolean;
    lastError?: Error;
    failedStep?: number;
  };
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
    event: "stepchange" | "actionerror" | "error" | "render" | "actionstart" | "actioncomplete" | "astchange",
    handler: (payload: unknown) => void
  ): () => void;
  // Optional accessor methods for editor and dynamic use cases
  getDeps?(): { diagram: DiagramHandle; camera?: CameraHandle; overlay?: OverlayHandle };
  getSteps?(): StepDefinition[];
  getCurrentStep?(): StepDefinition | null;
  getActionEngine?(): unknown; // ActionEngine is internal, return as unknown
  getExecutionContext?(): {
    currentAction?: ActionDefinition;
    currentStep?: StepDefinition;
    previousStep?: StepDefinition;
  };
  // Optional error recovery methods
  retry?(): Promise<void>;
  clearError?(): void;
  // Optional dynamic AST update method
  updateAst?(newAst: PresentationAst, options?: { preserveState?: boolean }): Promise<void>;
}

export interface ControllerHooks {
  onInit?: (controller: Controller) => void | Promise<void>;
  onStepChange?: (state: ControllerState, step: StepDefinition) => void | Promise<void>;
  onActionStart?: (action: ActionDefinition, step: StepDefinition) => void;
  onActionComplete?: (action: ActionDefinition, result: { success: boolean; error?: Error }) => void;
  onError?: (error: Error, context: { step?: StepDefinition; action?: ActionDefinition }) => void;
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
    controls?: ControlsHandle;
    createControls?: boolean;
    actionHandlers?: ActionHandlerMap;
    errorPolicy?: ErrorPolicy;
    hooks?: ControllerHooks;
  };
}
