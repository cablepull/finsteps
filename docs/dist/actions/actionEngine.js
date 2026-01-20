import { ActionError } from "../errors.js";
export class ActionEngine {
    constructor(handlers) {
        this.handlers = handlers;
    }
    async run(actions, context, errorPolicy) {
        const errors = [];
        for (const action of actions) {
            const handler = this.handlers[action.type];
            if (!handler) {
                const error = new ActionError(`Unknown action: ${action.type}`, "MPF_ACTION_UNKNOWN");
                if (errorPolicy === "haltOnError") {
                    throw error;
                }
                errors.push(error);
                continue;
            }
            try {
                await handler(context, action);
            }
            catch (error) {
                if (error instanceof Error) {
                    if (errorPolicy === "haltOnError") {
                        throw error;
                    }
                    errors.push(error);
                }
                else if (errorPolicy === "haltOnError") {
                    throw error;
                }
            }
        }
        return errors;
    }
}
//# sourceMappingURL=actionEngine.js.map