import { ActionEngine } from "../actions/actionEngine.js";
import { createDefaultActionHandlers } from "../actions/defaultActionHandlers.js";
import { BindingEngine } from "../bindings/bindingEngine.js";
import { EventEmitter } from "../eventEmitter.js";
import {
  ActionHandlerMap,
  CameraHandle,
  Controller,
  ControllerState,
  DiagramHandle,
  ErrorPolicy,
  OverlayHandle,
  PresentationAst,
  StepDefinition
} from "../types.js";

type ControllerDeps = {
  diagram: DiagramHandle;
  camera?: CameraHandle;
  overlay?: OverlayHandle;
  ast: PresentationAst;
  errorPolicy: ErrorPolicy;
  actionHandlers?: ActionHandlerMap;
};

export class MermaidController implements Controller {
  private emitter = new EventEmitter();
  private actionEngine: ActionEngine;
  private bindingEngine = new BindingEngine();
  private stepBindingEngine = new BindingEngine();
  private steps: StepDefinition[];
  private currentStepIndex = -1;

  constructor(private deps: ControllerDeps) {
    const handlers = {
      ...createDefaultActionHandlers(),
      ...(deps.actionHandlers ?? {})
    };
    this.actionEngine = new ActionEngine(handlers);
    this.steps = deps.ast.steps ?? [];
  }

  async init(renderPayload?: { diagram: DiagramHandle }): Promise<void> {
    if (renderPayload) {
      this.emitter.emit("render", renderPayload);
    }
    if (this.deps.ast.bindings?.length) {
      this.bindingEngine.bind(this.deps.ast.bindings, {
        diagram: this.deps.diagram,
        actionEngine: this.actionEngine,
        errorPolicy: this.deps.errorPolicy,
        controller: this,
        camera: this.deps.camera,
        overlay: this.deps.overlay,
        onError: (error) => this.emitActionError(error)
      });
    }
    if (this.steps.length > 0) {
      await this.goto(0);
    }
  }

  async next(): Promise<void> {
    await this.goto(this.currentStepIndex + 1);
  }

  async prev(): Promise<void> {
    await this.goto(this.currentStepIndex - 1);
  }

  async goto(step: number | string): Promise<void> {
    const index = typeof step === "number" ? step : this.steps.findIndex((s) => s.id === step);
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    const stepDef = this.steps[index];
    const errorPolicy = stepDef.errorPolicy ?? this.deps.errorPolicy;
    this.stepBindingEngine.destroy();

    // Cleanup phase: clear previous state before applying new actions
    // This ensures proper rendering order with presentation frameworks
    if (this.deps.overlay?.clear) {
      this.deps.overlay.clear();
    }
    // Check if first action is a camera action - if so, skip reset as the action will set viewBox
    const firstActionIsCamera = stepDef.actions.length > 0 && 
      (stepDef.actions[0].type === "camera.fit" || stepDef.actions[0].type === "camera.reset" || stepDef.actions[0].type === "camera.fitAll");
    if (this.deps.camera && !firstActionIsCamera) {
      this.deps.camera.reset();
    }
    // Clear highlights by running the style.clear action
    await this.actionEngine.run(
      [{ type: "style.clear" }],
      {
        controller: this,
        diagram: this.deps.diagram,
        camera: this.deps.camera,
        overlay: this.deps.overlay
      },
      "continueOnError"
    );
    // Wait for next animation frame to ensure DOM is stable
    // This coordinates with presentation frameworks that animate slide changes
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    try {
      const errors = await this.actionEngine.run(
        stepDef.actions,
        {
          controller: this,
          diagram: this.deps.diagram,
          camera: this.deps.camera,
          overlay: this.deps.overlay
        },
        errorPolicy
      );
      for (const error of errors) {
        this.emitActionError(error);
      }
    } catch (error) {
      const actionError = error instanceof Error ? error : new Error(String(error));
      this.emitActionError(actionError);
      if (errorPolicy === "haltOnError") {
        return;
      }
    }
    this.currentStepIndex = index;
    if (stepDef.bindings?.length) {
      this.stepBindingEngine.bind(stepDef.bindings, {
        diagram: this.deps.diagram,
        actionEngine: this.actionEngine,
        errorPolicy,
        controller: this,
        camera: this.deps.camera,
        overlay: this.deps.overlay,
        onError: (error) => this.emitActionError(error)
      });
    }
    this.emitter.emit("stepchange", this.getState());
  }

  async reset(): Promise<void> {
    await this.goto(0);
  }

  destroy(): void {
    this.bindingEngine.destroy();
    this.stepBindingEngine.destroy();
    this.deps.camera?.destroy();
    this.deps.overlay?.destroy();
    this.deps.diagram.destroy();
    this.emitter.clear();
  }

  getState(): ControllerState {
    return {
      stepIndex: this.currentStepIndex,
      stepId: this.steps[this.currentStepIndex]?.id,
      stepCount: this.steps.length
    };
  }

  async setState(partial: Partial<ControllerState>): Promise<void> {
    if (typeof partial.stepIndex === "number") {
      await this.goto(partial.stepIndex);
      return;
    }
    if (typeof partial.stepId === "string") {
      await this.goto(partial.stepId);
    }
  }

  on(
    event: "stepchange" | "actionerror" | "error" | "render",
    handler: (payload: unknown) => void
  ): () => void {
    return this.emitter.on(event, handler);
  }

  private emitActionError(error: Error): void {
    this.emitter.emit("actionerror", error);
    this.emitter.emit("error", error);
  }
}
