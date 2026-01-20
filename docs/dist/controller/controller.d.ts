import { ActionEngine } from "../actions/actionEngine.js";
import { ActionDefinition, ActionHandlerMap, CameraHandle, Controller, ControllerHooks, ControllerState, DiagramHandle, ErrorPolicy, OverlayHandle, PresentationAst, StepDefinition } from "../types.js";
type ControllerDeps = {
    diagram: DiagramHandle;
    camera?: CameraHandle;
    overlay?: OverlayHandle;
    ast: PresentationAst;
    errorPolicy: ErrorPolicy;
    actionHandlers?: ActionHandlerMap;
    hooks?: ControllerHooks;
};
export declare class MermaidController implements Controller {
    private deps;
    private emitter;
    private actionEngine;
    private bindingEngine;
    private stepBindingEngine;
    private steps;
    private currentStepIndex;
    private previousStepIndex;
    private lastError;
    private failedStepIndex;
    private executionContext;
    constructor(deps: ControllerDeps);
    init(renderPayload?: {
        diagram: DiagramHandle;
    }): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    goto(step: number | string): Promise<void>;
    reset(): Promise<void>;
    retry(): Promise<void>;
    clearError(): void;
    updateAst(newAst: PresentationAst, options?: {
        preserveState?: boolean;
    }): Promise<void>;
    destroy(): void;
    getState(): ControllerState;
    getExecutionContext(): {
        currentAction?: ActionDefinition;
        currentStep?: StepDefinition;
        previousStep?: StepDefinition;
    };
    setState(partial: Partial<ControllerState>): Promise<void>;
    on(event: "stepchange" | "actionerror" | "error" | "render", handler: (payload: unknown) => void): () => void;
    getDeps(): {
        diagram: DiagramHandle;
        camera?: CameraHandle;
        overlay?: OverlayHandle;
    };
    getSteps(): StepDefinition[];
    getCurrentStep(): StepDefinition | null;
    getActionEngine(): ActionEngine;
    private emitActionError;
}
export {};
//# sourceMappingURL=controller.d.ts.map