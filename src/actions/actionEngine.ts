import { ActionContext, ActionDefinition, ActionHandlerMap, ErrorPolicy } from "../types.js";

export class ActionEngine {
  constructor(private handlers: ActionHandlerMap) {}

  async run(
    actions: ActionDefinition[],
    context: ActionContext,
    errorPolicy: ErrorPolicy
  ): Promise<Error[]> {
    const errors: Error[] = [];
    for (const action of actions) {
      const handler = this.handlers[action.type];
      if (!handler) {
        const error = new Error(`Unknown action: ${action.type}`);
        if (errorPolicy === "haltOnError") {
          throw error;
        }
        errors.push(error);
        continue;
      }
      try {
        await handler(context, action);
      } catch (error) {
        if (error instanceof Error) {
          if (errorPolicy === "haltOnError") {
            throw error;
          }
          errors.push(error);
        } else if (errorPolicy === "haltOnError") {
          throw error;
        }
      }
    }
    return errors;
  }
}
