import { ActionContext, ActionDefinition, ActionHandlerMap, ErrorPolicy } from "../types.js";
export declare class ActionEngine {
    private handlers;
    constructor(handlers: ActionHandlerMap);
    run(actions: ActionDefinition[], context: ActionContext, errorPolicy: ErrorPolicy): Promise<Error[]>;
}
//# sourceMappingURL=actionEngine.d.ts.map