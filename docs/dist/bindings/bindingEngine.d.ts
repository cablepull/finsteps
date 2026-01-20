import type { CameraHandle, Controller, OverlayHandle } from "../types.js";
import { BindingDefinition, DiagramHandle, ErrorPolicy } from "../types.js";
import { ActionEngine } from "../actions/actionEngine.js";
type BindingContext = {
    diagram: DiagramHandle;
    actionEngine: ActionEngine;
    errorPolicy: ErrorPolicy;
    onError: (error: Error) => void;
    controller: Controller;
    camera?: CameraHandle;
    overlay?: OverlayHandle;
};
export declare class BindingEngine {
    private disposers;
    private timeouts;
    bind(bindings: BindingDefinition[], context: BindingContext): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=bindingEngine.d.ts.map