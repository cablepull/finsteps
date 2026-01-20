import { ActionEngine } from "../actions/actionEngine.js";
import { createDefaultActionHandlers } from "../actions/defaultActionHandlers.js";
import { BindingEngine } from "../bindings/bindingEngine.js";
import { EventEmitter } from "../eventEmitter.js";
export class MermaidController {
    constructor(deps) {
        this.deps = deps;
        this.emitter = new EventEmitter();
        this.bindingEngine = new BindingEngine();
        this.stepBindingEngine = new BindingEngine();
        this.currentStepIndex = -1;
        this.previousStepIndex = -1;
        this.lastError = null;
        this.failedStepIndex = null;
        this.executionContext = {};
        const handlers = {
            ...createDefaultActionHandlers(),
            ...(deps.actionHandlers ?? {})
        };
        this.actionEngine = new ActionEngine(handlers);
        this.steps = deps.ast.steps ?? [];
    }
    async init(renderPayload) {
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
        // Invoke onInit hook
        if (this.deps.hooks?.onInit) {
            try {
                await this.deps.hooks.onInit(this);
            }
            catch (error) {
                console.warn('[MermaidController] onInit hook error:', error);
            }
        }
    }
    async next() {
        await this.goto(this.currentStepIndex + 1);
    }
    async prev() {
        await this.goto(this.currentStepIndex - 1);
    }
    async goto(step) {
        const index = typeof step === "number" ? step : this.steps.findIndex((s) => s.id === step);
        if (index < 0 || index >= this.steps.length) {
            return;
        }
        const stepDef = this.steps[index];
        const errorPolicy = stepDef.errorPolicy ?? this.deps.errorPolicy;
        // Track previous state for enhanced events
        this.previousStepIndex = this.currentStepIndex;
        const previousStep = this.previousStepIndex >= 0 ? this.steps[this.previousStepIndex] : undefined;
        this.executionContext.previousStep = previousStep;
        this.executionContext.currentStep = stepDef;
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
        await this.actionEngine.run([{ type: "style.clear" }], {
            controller: this,
            diagram: this.deps.diagram,
            camera: this.deps.camera,
            overlay: this.deps.overlay
        }, "continueOnError");
        // Wait for next animation frame to ensure DOM is stable
        // This coordinates with presentation frameworks that animate slide changes
        await new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });
        // Track action execution for observability
        let actionErrors = [];
        let actionFailed = false;
        try {
            // Emit actionstart events for each action
            for (const action of stepDef.actions) {
                this.executionContext.currentAction = action;
                const actionStartPayload = {
                    action: { ...action },
                    step: { ...stepDef },
                    context: this.getExecutionContext()
                };
                this.emitter.emit("actionstart", actionStartPayload);
                // Invoke onActionStart hook
                if (this.deps.hooks?.onActionStart) {
                    try {
                        this.deps.hooks.onActionStart(action, stepDef);
                    }
                    catch (error) {
                        console.warn('[MermaidController] onActionStart hook error:', error);
                    }
                }
            }
            const errors = await this.actionEngine.run(stepDef.actions, {
                controller: this,
                diagram: this.deps.diagram,
                camera: this.deps.camera,
                overlay: this.deps.overlay
            }, errorPolicy);
            actionErrors = errors;
            // Emit actioncomplete events
            for (const action of stepDef.actions) {
                const actionError = errors.find(e => e instanceof Error && e.message.includes(action.type));
                const result = {
                    success: !actionError,
                    error: actionError
                };
                const actionCompletePayload = {
                    action: { ...action },
                    result,
                    step: { ...stepDef },
                    context: this.getExecutionContext()
                };
                this.emitter.emit("actioncomplete", actionCompletePayload);
                // Invoke onActionComplete hook
                if (this.deps.hooks?.onActionComplete) {
                    try {
                        this.deps.hooks.onActionComplete(action, result);
                    }
                    catch (error) {
                        console.warn('[MermaidController] onActionComplete hook error:', error);
                    }
                }
            }
            for (const error of errors) {
                this.emitActionError(error, stepDef);
            }
        }
        catch (error) {
            actionFailed = true;
            const actionError = error instanceof Error ? error : new Error(String(error));
            this.lastError = actionError;
            this.failedStepIndex = index;
            this.emitActionError(actionError, stepDef);
            if (errorPolicy === "haltOnError") {
                // Still update stepIndex to indicate attempted step (for error recovery)
                this.currentStepIndex = index;
                this.emitter.emit("stepchange", {
                    state: this.getState(),
                    previousState: {
                        stepIndex: this.previousStepIndex,
                        stepId: this.steps[this.previousStepIndex]?.id,
                        stepCount: this.steps.length
                    },
                    step: { ...stepDef },
                    previousStep: previousStep ? { ...previousStep } : undefined
                });
                return;
            }
        }
        // Clear error state on successful execution
        if (!actionFailed && actionErrors.length === 0) {
            this.lastError = null;
            this.failedStepIndex = null;
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
                onError: (error) => this.emitActionError(error, stepDef)
            });
        }
        // Clear current action from context
        this.executionContext.currentAction = undefined;
        // Emit enhanced stepchange event with context
        const stepChangePayload = {
            state: this.getState(),
            previousState: {
                stepIndex: this.previousStepIndex,
                stepId: this.steps[this.previousStepIndex]?.id,
                stepCount: this.steps.length
            },
            step: { ...stepDef },
            previousStep: previousStep ? { ...previousStep } : undefined
        };
        this.emitter.emit("stepchange", stepChangePayload);
        // Invoke onStepChange hook
        if (this.deps.hooks?.onStepChange) {
            try {
                await this.deps.hooks.onStepChange(this.getState(), stepDef);
            }
            catch (error) {
                console.warn('[MermaidController] onStepChange hook error:', error);
            }
        }
    }
    async reset() {
        await this.goto(0);
    }
    async retry() {
        if (this.failedStepIndex !== null && this.failedStepIndex >= 0) {
            await this.goto(this.failedStepIndex);
        }
        else if (this.currentStepIndex >= 0) {
            // Retry current step if no failed step recorded
            await this.goto(this.currentStepIndex);
        }
    }
    clearError() {
        this.lastError = null;
        this.failedStepIndex = null;
    }
    async updateAst(newAst, options) {
        const preserveState = options?.preserveState ?? false;
        const previousState = this.getState();
        const currentStepId = this.steps[this.currentStepIndex]?.id;
        // Update AST
        this.deps.ast = newAst;
        this.steps = newAst.steps ?? [];
        // Rebind bindings if changed
        this.bindingEngine.destroy();
        if (newAst.bindings?.length) {
            this.bindingEngine.bind(newAst.bindings, {
                diagram: this.deps.diagram,
                actionEngine: this.actionEngine,
                errorPolicy: this.deps.errorPolicy,
                controller: this,
                camera: this.deps.camera,
                overlay: this.deps.overlay,
                onError: (error) => this.emitActionError(error)
            });
        }
        // Handle state preservation
        if (preserveState && currentStepId) {
            // Try to find the step with the same ID in the new AST
            const newStepIndex = this.steps.findIndex(s => s.id === currentStepId);
            if (newStepIndex >= 0) {
                // Step still exists, try to maintain it
                this.currentStepIndex = newStepIndex;
                // Re-execute the step to apply any changes
                await this.goto(newStepIndex);
            }
            else {
                // Step no longer exists, reset to first step
                if (this.steps.length > 0) {
                    await this.goto(0);
                }
                else {
                    this.currentStepIndex = -1;
                }
            }
        }
        else {
            // Reset to first step
            if (this.steps.length > 0) {
                await this.goto(0);
            }
            else {
                this.currentStepIndex = -1;
            }
        }
        // Emit astchange event
        this.emitter.emit("astchange", {
            previousState,
            newState: this.getState(),
            previousSteps: previousState.stepCount,
            newSteps: this.steps.length
        });
    }
    destroy() {
        this.bindingEngine.destroy();
        this.stepBindingEngine.destroy();
        this.deps.camera?.destroy();
        this.deps.overlay?.destroy();
        this.deps.diagram.destroy();
        this.emitter.clear();
    }
    getState() {
        return {
            stepIndex: this.currentStepIndex,
            stepId: this.steps[this.currentStepIndex]?.id,
            stepCount: this.steps.length,
            errorState: this.lastError ? {
                hasError: true,
                lastError: this.lastError,
                failedStep: this.failedStepIndex ?? undefined
            } : undefined
        };
    }
    getExecutionContext() {
        return {
            currentAction: this.executionContext.currentAction ? { ...this.executionContext.currentAction } : undefined,
            currentStep: this.executionContext.currentStep ? { ...this.executionContext.currentStep } : undefined,
            previousStep: this.executionContext.previousStep ? { ...this.executionContext.previousStep } : undefined
        };
    }
    async setState(partial) {
        if (typeof partial.stepIndex === "number") {
            await this.goto(partial.stepIndex);
            return;
        }
        if (typeof partial.stepId === "string") {
            await this.goto(partial.stepId);
        }
    }
    on(event, handler) {
        return this.emitter.on(event, handler);
    }
    // Accessor methods for editor and dynamic use cases
    getDeps() {
        return {
            diagram: this.deps.diagram,
            camera: this.deps.camera,
            overlay: this.deps.overlay
        };
    }
    getSteps() {
        // Return a copy to prevent external modification
        return this.steps.map(step => ({ ...step }));
    }
    getCurrentStep() {
        if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
            return null;
        }
        return { ...this.steps[this.currentStepIndex] };
    }
    getActionEngine() {
        return this.actionEngine;
    }
    emitActionError(error, step) {
        this.lastError = error;
        const errorContext = {
            step: step ? { ...step } : this.executionContext.currentStep,
            action: this.executionContext.currentAction
        };
        const context = {
            error,
            ...errorContext,
            context: this.getExecutionContext()
        };
        this.emitter.emit("actionerror", context);
        this.emitter.emit("error", context);
        // Invoke onError hook
        if (this.deps.hooks?.onError) {
            try {
                this.deps.hooks.onError(error, errorContext);
            }
            catch (hookError) {
                console.warn('[MermaidController] onError hook error:', hookError);
            }
        }
    }
}
//# sourceMappingURL=controller.js.map